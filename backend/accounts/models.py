from django.contrib.auth.models import AbstractUser
from django.db import models


class AdminUser(AbstractUser):
    """
    Single-admin model. This is a superuser-only system - there is only ever
    expected to be one (or a small handful of) admin accounts that have full
    control. We extend AbstractUser so we can track last_activity for the
    24-hour forced re-login behaviour at the JWT layer.
    """

    phone = models.CharField(max_length=20, blank=True, default="")
    last_activity = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Admin User"
        verbose_name_plural = "Admin Users"

    def __str__(self):
        return self.username
