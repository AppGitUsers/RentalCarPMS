from django.db import models


class CarOwner(models.Model):
    """
    The individual who owns a vehicle and lends it to the rental company.
    The company pays this owner a share of the rental revenue (either per
    rental, or as a collective payout clearing multiple rentals at once).
    """

    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    alternate_phone = models.CharField(max_length=20, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    address = models.TextField(blank=True, default="")

    # Payout details - used to render a dynamic UPI QR code for the admin
    # to scan and pay the owner manually (no payment gateway integration).
    upi_id = models.CharField(max_length=100, blank=True, default="")
    upi_payee_name = models.CharField(
        max_length=150, blank=True, default="",
        help_text="Name to display/encode on the UPI QR. Defaults to owner name if blank.",
    )

    id_proof_number = models.CharField(max_length=50, blank=True, default="")
    id_proof_photo = models.ImageField(upload_to="owners/id_proofs/", blank=True, null=True)
    notes = models.TextField(blank=True, default="")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    @property
    def payee_display_name(self):
        return self.upi_payee_name or self.name
