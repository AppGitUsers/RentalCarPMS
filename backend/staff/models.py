from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.db import models


def q2(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class Shift(models.Model):
    """A named shift template that defines working hours, grace windows, and which days of the week it applies."""
    name = models.CharField(max_length=50)
    start_time = models.TimeField()
    end_time = models.TimeField()
    late_grace_minutes = models.PositiveIntegerField(
        default=15,
        help_text="Minutes after shift start before an entry is flagged as late.",
    )
    ot_grace_minutes = models.PositiveIntegerField(
        default=15,
        help_text="Minutes after shift end before overtime starts counting.",
    )

    # Working days — used to calculate expected hours per month.
    work_mon = models.BooleanField(default=True)
    work_tue = models.BooleanField(default=True)
    work_wed = models.BooleanField(default=True)
    work_thu = models.BooleanField(default=True)
    work_fri = models.BooleanField(default=True)
    work_sat = models.BooleanField(default=False)
    work_sun = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["start_time"]

    def __str__(self):
        return f"{self.name} ({self.start_time.strftime('%H:%M')}–{self.end_time.strftime('%H:%M')})"

    def shift_hours(self):
        """Total scheduled hours for this shift (cross-midnight safe)."""
        start = datetime.combine(datetime.today().date(), self.start_time)
        end = datetime.combine(datetime.today().date(), self.end_time)
        if end <= start:
            end += timedelta(days=1)
        return round((end - start).total_seconds() / 3600, 2)

    @property
    def working_day_indices(self):
        """Weekday indices (0=Mon … 6=Sun) on which this shift is scheduled."""
        flags = [self.work_mon, self.work_tue, self.work_wed, self.work_thu,
                 self.work_fri, self.work_sat, self.work_sun]
        return [i for i, active in enumerate(flags) if active]

    @property
    def working_days_display(self):
        names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        return ', '.join(names[i] for i in self.working_day_indices)

    def working_days_in_month(self, year: int, month: int) -> int:
        """Count how many calendar days in the given month fall on this shift's working days."""
        import calendar as cal
        import datetime as dt
        days = cal.monthrange(year, month)[1]
        indices = set(self.working_day_indices)
        return sum(
            1 for d in range(1, days + 1)
            if dt.date(year, month, d).weekday() in indices
        )


class StaffMember(models.Model):
    ROLE_CHOICES = [
        ("manager", "Manager"),
        ("driver", "Driver"),
        ("cleaner", "Cleaner / Detailer"),
        ("front_desk", "Front Desk"),
        ("mechanic", "Mechanic"),
        ("other", "Other"),
    ]

    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, default="")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="other")
    photo = models.ImageField(upload_to="staff/photos/", blank=True, null=True)

    monthly_salary = models.DecimalField(max_digits=10, decimal_places=2)
    date_joined = models.DateField()
    is_active = models.BooleanField(default=True)

    default_shift = models.ForeignKey(
        Shift,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="staff_members",
        help_text="Default shift template for this staff member.",
    )

    address = models.TextField(blank=True, default="")
    id_proof_number = models.CharField(max_length=50, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name

    def daily_rate(self):
        return q2(Decimal(self.monthly_salary) / Decimal(30))


class Attendance(models.Model):
    STATUS_CHOICES = [
        ("present", "Present"),
        ("absent", "Absent"),
        ("half_day", "Half Day"),
        ("leave", "On Leave"),
    ]

    staff = models.ForeignKey(StaffMember, on_delete=models.CASCADE, related_name="attendance_records")
    date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="present")
    shift = models.ForeignKey(
        Shift,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_records",
    )
    shift_in = models.TimeField(null=True, blank=True)
    shift_out = models.TimeField(null=True, blank=True)
    is_late = models.BooleanField(default=False)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    notes = models.CharField(max_length=200, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        unique_together = ["staff", "date"]

    def __str__(self):
        return f"{self.staff.full_name} - {self.date} - {self.status}"

    def hours_worked(self):
        if self.shift_in and self.shift_out:
            start = datetime.combine(self.date, self.shift_in)
            end = datetime.combine(self.date, self.shift_out)
            if end < start:
                end += timedelta(days=1)
            return round((end - start).total_seconds() / 3600, 2)
        return None

    def compute_shift_flags(self):
        """Compute is_late and overtime_hours from the assigned shift and actual clock times."""
        if not self.shift or not self.shift_in:
            self.is_late = False
            self.overtime_hours = Decimal("0.00")
            return

        late_threshold = (
            datetime.combine(self.date, self.shift.start_time)
            + timedelta(minutes=self.shift.late_grace_minutes)
        ).time()
        self.is_late = self.shift_in > late_threshold

        if self.shift_out:
            ot_start = datetime.combine(self.date, self.shift.end_time) + timedelta(minutes=self.shift.ot_grace_minutes)
            actual_out = datetime.combine(self.date, self.shift_out)
            # Handle cross-midnight: if punch-out is earlier than shift end on the clock face, it's next day.
            if self.shift_out < self.shift.start_time:
                actual_out += timedelta(days=1)
            ot_secs = max((actual_out - ot_start).total_seconds(), 0)
            self.overtime_hours = q2(Decimal(ot_secs) / Decimal(3600))
        else:
            self.overtime_hours = Decimal("0.00")


class SalaryPayment(models.Model):
    staff = models.ForeignKey(StaffMember, on_delete=models.CASCADE, related_name="salary_payments")
    month = models.PositiveSmallIntegerField()
    year = models.PositiveIntegerField()

    days_present = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_hours_worked = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    expected_hours = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    late_count = models.PositiveIntegerField(default=0)
    overtime_hours_total = models.DecimalField(max_digits=7, decimal_places=2, default=0)

    computed_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    adjustment = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Manual bonus (+) or deduction (-) before marking paid.",
    )
    final_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    notes = models.CharField(max_length=200, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-year", "-month"]
        unique_together = ["staff", "month", "year"]

    def __str__(self):
        return f"{self.staff.full_name} - {self.month}/{self.year}"
