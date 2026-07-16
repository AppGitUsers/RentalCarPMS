from django.core.cache import cache
from django.db import models

from core.utils.images import compress_image_field


class ApplicationSettings(models.Model):
    """
    Singleton settings row. Only one instance should ever exist (pk=1).
    All business-rule constants used across the app are centralised here so
    the admin can change behaviour without touching code.
    """

    # ---- Company / Invoice branding ----
    company_name = models.CharField(max_length=150, default="Your Car Rental Co.")
    company_address = models.TextField(blank=True, default="")
    company_phone = models.CharField(max_length=20, blank=True, default="")
    company_email = models.EmailField(blank=True, default="")
    company_logo = models.ImageField(upload_to="branding/", blank=True, null=True)
    company_upi_id = models.CharField(
        max_length=100, blank=True, default="",
        help_text="The company's own UPI ID, used to generate the dynamic customer-payment QR.",
    )
    invoice_prefix = models.CharField(max_length=10, default="INV")
    invoice_footer_note = models.TextField(
        blank=True,
        default="Thank you for choosing us. Drive safe!",
    )
    invoice_terms = models.TextField(
        blank=True,
        default=(
            "1. Customer is responsible for the vehicle during the rental period.\n"
            "2. Fuel is to be returned at the same level as at pickup.\n"
            "3. Any damages will be charged as per assessment.\n"
            "4. Late return will be charged as per the late fee policy."
        ),
    )

    # ---- Charges ----
    gst_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=0.00,
        help_text="GST % applied on top of the base rental amount across the app.",
    )
    extra_km_charge_per_km = models.DecimalField(
        max_digits=10, decimal_places=2, default=10.00,
        help_text="Charge per km when the distance covered exceeds the included free km limit.",
    )
    free_km_per_day = models.PositiveIntegerField(
        default=200,
        help_text="Free km included per booked day before extra km charges apply.",
    )
    grace_period_minutes = models.PositiveIntegerField(
        default=30,
        help_text="Grace period (in minutes) after the booked end time before late fee starts applying.",
    )

    # ---- Staff payroll ----
    standard_shift_hours = models.DecimalField(
        max_digits=4, decimal_places=2, default=8.00,
        help_text="Standard working hours per day used to pro-rate daily salary from monthly salary.",
    )

    # ---- Misc ----
    currency_symbol = models.CharField(max_length=5, default="₹")
    session_timeout_hours = models.PositiveIntegerField(
        default=24,
        help_text="Admin must re-login after this many hours of inactivity from last login.",
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Application Settings"
        verbose_name_plural = "Application Settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        compress_image_field(self.company_logo, max_px=800, quality=85)
        super().save(*args, **kwargs)
        cache.delete('app_settings')

    def delete(self, *args, **kwargs):
        pass  # singleton row must never be deleted

    @classmethod
    def load(cls):
        obj = cache.get('app_settings')
        if obj is None:
            obj, _ = cls.objects.get_or_create(pk=1)
            cache.set('app_settings', obj, timeout=300)
        return obj

    def __str__(self):
        return "Application Settings"
