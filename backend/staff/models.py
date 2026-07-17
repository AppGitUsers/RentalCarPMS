import calendar as _cal
from decimal import ROUND_HALF_UP, Decimal

from django.db import models

from core.utils.images import compress_image_field


def q2(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


ROLE_CHOICES = [
    ('driver', 'Driver'),
    ('cleaner', 'Cleaner'),
    ('watchman', 'Watchman'),
    ('manager', 'Manager'),
    ('mechanic', 'Mechanic'),
    ('front_desk', 'Front Desk'),
    ('other', 'Other'),
]

EMPLOYMENT_TYPE_CHOICES = [
    ('permanent', 'Permanent'),
    ('temporary', 'Temporary'),
]


class StaffMember(models.Model):
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True, default='')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='other')
    employment_type = models.CharField(
        max_length=10, choices=EMPLOYMENT_TYPE_CHOICES, default='permanent',
    )
    photo = models.ImageField(upload_to='staff/photos/', blank=True, null=True)
    monthly_salary = models.DecimalField(max_digits=10, decimal_places=2)
    date_joined = models.DateField()
    is_active = models.BooleanField(default=True)
    address = models.TextField(blank=True, default='')
    id_proof_number = models.CharField(max_length=50, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        compress_image_field(self.photo, max_px=500, quality=85)
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['full_name']

    def __str__(self):
        return self.full_name


class StaffAttendance(models.Model):
    STATUS_CHOICES = [
        ('absent', 'Absent'),
        ('cl', 'Casual Leave'),
    ]
    staff = models.ForeignKey(StaffMember, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)

    class Meta:
        unique_together = ['staff', 'date']
        ordering = ['date']

    def __str__(self):
        return f"{self.staff.full_name} – {self.date} – {self.status}"


class StaffPayment(models.Model):
    staff = models.ForeignKey(StaffMember, on_delete=models.CASCADE, related_name='salary_payments')
    year = models.PositiveIntegerField()
    month = models.PositiveSmallIntegerField()
    working_days = models.PositiveIntegerField(default=0)
    absent_days = models.PositiveIntegerField(default=0)
    cl_days = models.PositiveIntegerField(default=0)
    deduction_days = models.PositiveIntegerField(default=0)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_at = models.DateTimeField(auto_now_add=True)
    notes = models.CharField(max_length=200, blank=True, default='')

    class Meta:
        ordering = ['-year', '-month', '-paid_at']

    def __str__(self):
        return f"{self.staff.full_name} – {self.month}/{self.year} – {self.amount}"
