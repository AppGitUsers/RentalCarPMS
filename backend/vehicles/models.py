from django.db import models

from owners.models import CarOwner


class Vehicle(models.Model):
    FUEL_CHOICES = [
        ("petrol", "Petrol"),
        ("diesel", "Diesel"),
        ("electric", "Electric"),
        ("cng", "CNG"),
        ("hybrid", "Hybrid"),
    ]
    TRANSMISSION_CHOICES = [
        ("manual", "Manual"),
        ("automatic", "Automatic"),
    ]
    STATUS_CHOICES = [
        ("available", "Available"),
        ("rented", "Rented Out"),
        ("maintenance", "Under Maintenance"),
        ("inactive", "Inactive"),
    ]

    owner = models.ForeignKey(CarOwner, on_delete=models.PROTECT, related_name="vehicles")

    registration_number = models.CharField(max_length=20, unique=True)
    make = models.CharField(max_length=60)
    model = models.CharField(max_length=60)
    year = models.PositiveIntegerField(null=True, blank=True)
    color = models.CharField(max_length=30, blank=True, default="")
    seating_capacity = models.PositiveIntegerField(default=4)
    fuel_type = models.CharField(max_length=20, choices=FUEL_CHOICES, default="petrol")
    transmission = models.CharField(max_length=20, choices=TRANSMISSION_CHOICES, default="manual")

    primary_photo = models.ImageField(upload_to="vehicles/", blank=True, null=True)

    current_odometer = models.PositiveIntegerField(default=0, help_text="Latest known odometer reading (km).")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="available")

    insurance_expiry = models.DateField(null=True, blank=True)
    permit_expiry = models.DateField(null=True, blank=True)
    fitness_expiry = models.DateField(null=True, blank=True)
    rc_number = models.CharField(max_length=50, blank=True, default="")

    notes = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["registration_number"]

    def __str__(self):
        return f"{self.registration_number} ({self.make} {self.model})"


class VehicleOwnerRate(models.Model):
    """
    Per-vehicle pricing and owner payout configuration.
    vehicle_daily_rate  — what the customer is charged per day.
    owner_daily_amount  — fixed ₹ the owner receives per booked day.
    owner_extra_km_percent / owner_damage_percent — % of those charge components that go to the owner.
    Late fee for owner is derived from owner_daily_amount (half or full day based on the 6-hour rule).
    """
    vehicle = models.OneToOneField(Vehicle, on_delete=models.CASCADE, related_name='owner_rate')
    vehicle_daily_rate = models.DecimalField(max_digits=10, decimal_places=2)
    owner_daily_amount = models.DecimalField(max_digits=10, decimal_places=2)
    owner_extra_km_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    owner_damage_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Rate for {self.vehicle.registration_number}"


class VehicleImage(models.Model):
    """Additional gallery images for a vehicle (beyond the primary photo)."""
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="gallery_images")
    image = models.ImageField(upload_to="vehicles/gallery/")
    caption = models.CharField(max_length=100, blank=True, default="")
    uploaded_at = models.DateTimeField(auto_now_add=True)
