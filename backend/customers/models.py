from django.db import models


class Customer(models.Model):
    """
    A renter. Stores legal/identity details required to rent a vehicle.
    A customer can have multiple rentals over time (history is linked via
    the Rental model's FK), so we don't duplicate customer records per booking.
    """
    ID_PROOF_TYPES = [
        ("driving_license", "Driving License"),
        ("aadhaar", "Aadhaar Card"),
        ("passport", "Passport"),
        ("voter_id", "Voter ID"),
        ("other", "Other"),
    ]

    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    alternate_phone = models.CharField(max_length=20, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    address = models.TextField(blank=True, default="")

    id_proof_type = models.CharField(max_length=30, choices=ID_PROOF_TYPES, default="driving_license")
    id_proof_number = models.CharField(max_length=50, blank=True, default="")
    id_proof_photo_front = models.ImageField(upload_to="customers/id_proofs/", blank=True, null=True)
    id_proof_photo_back = models.ImageField(upload_to="customers/id_proofs/", blank=True, null=True)

    driving_license_number = models.CharField(max_length=50, blank=True, default="")
    driving_license_photo = models.ImageField(upload_to="customers/licenses/", blank=True, null=True)

    customer_photo = models.ImageField(
        upload_to="customers/photos/", blank=True, null=True,
        help_text="Photo of the customer taken at pickup, for record/verification.",
    )

    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} ({self.phone})"
