from django.contrib.auth.models import AbstractUser
from django.db import models


class AdminUser(AbstractUser):
    ROLE_CHOICES = [('admin', 'Admin'), ('staff', 'Staff')]

    phone = models.CharField(max_length=20, blank=True, default="")
    last_activity = models.DateTimeField(null=True, blank=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='admin')
    staff_member = models.OneToOneField(
        'staff.StaffMember', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='user_account',
    )

    class Meta:
        verbose_name = "Admin User"
        verbose_name_plural = "Admin Users"

    def __str__(self):
        return self.username
