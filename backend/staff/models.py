from decimal import ROUND_HALF_UP, Decimal

from django.db import models


def q2(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


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
        """Approximate per-day salary, based on a 30-day month."""
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
    shift_in = models.TimeField(null=True, blank=True)
    shift_out = models.TimeField(null=True, blank=True)
    notes = models.CharField(max_length=200, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        unique_together = ["staff", "date"]

    def __str__(self):
        return f"{self.staff.full_name} - {self.date} - {self.status}"

    def hours_worked(self):
        if self.shift_in and self.shift_out:
            from datetime import datetime
            start = datetime.combine(self.date, self.shift_in)
            end = datetime.combine(self.date, self.shift_out)
            if end < start:
                from datetime import timedelta
                end += timedelta(days=1)
            return round((end - start).total_seconds() / 3600, 2)
        return None


class SalaryPayment(models.Model):
    """
    Monthly payroll record for a staff member. Computed amount is based on
    attendance for that month, pro-rated by working hours vs the standard
    shift length from Settings, then the admin can mark it paid.
    """
    staff = models.ForeignKey(StaffMember, on_delete=models.CASCADE, related_name="salary_payments")
    month = models.PositiveSmallIntegerField()
    year = models.PositiveIntegerField()

    days_present = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_hours_worked = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    expected_hours = models.DecimalField(max_digits=7, decimal_places=2, default=0)

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
