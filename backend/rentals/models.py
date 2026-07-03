from decimal import ROUND_HALF_UP, Decimal

from django.db import models
from django.utils import timezone

from customers.models import Customer
from owners.models import CarOwner
from vehicles.models import Vehicle


def q2(value):
    """Quantize a Decimal to 2 places, half-up, the way money should round."""
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class Rental(models.Model):
    STATUS_CHOICES = [
        ("booked", "Booked (Upcoming)"),
        ("active", "Active (Car Out)"),
        ("closed", "Closed"),
        ("cancelled", "Cancelled"),
    ]
    PAYMENT_TIMING_CHOICES = [
        ("now", "Pay Now"),
        ("later", "Pay Later"),
    ]
    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("partial", "Partially Paid"),
        ("paid", "Paid"),
    ]

    # ---- Step 1: Customer ----
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="rentals")

    # ---- Step 2: Vehicle / trip details ----
    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name="rentals")
    number_of_vehicles = models.PositiveIntegerField(
        default=1, help_text="Number of vehicles requested under this booking (usually 1).",
    )
    destination = models.CharField(max_length=200, blank=True, default="")
    purpose = models.CharField(max_length=200, blank=True, default="", help_text="Purpose/reason for the trip.")

    scheduled_start = models.DateTimeField()
    scheduled_end = models.DateTimeField()
    booked_days = models.PositiveIntegerField(default=1)

    odometer_start = models.PositiveIntegerField(null=True, blank=True)
    odometer_end = models.PositiveIntegerField(null=True, blank=True)

    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)

    # ---- Step 3: Payment plan ----
    payment_timing = models.CharField(max_length=10, choices=PAYMENT_TIMING_CHOICES, default="later")
    security_deposit_collected = models.BooleanField(default=False)
    security_deposit_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # ---- Pricing snapshot (locked at booking time so later Settings changes
    #      don't retroactively alter historical invoices) ----
    daily_rate_snapshot = models.DecimalField(max_digits=10, decimal_places=2)
    gst_percent_snapshot = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    extra_km_charge_snapshot = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    free_km_total_snapshot = models.PositiveIntegerField(default=0, help_text="Free km allowed for the full booking.")
    grace_period_minutes_snapshot = models.PositiveIntegerField(default=30)

    # ---- Computed charge breakdown (filled progressively / finalised at close) ----
    base_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    late_fee_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    extra_km_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    damage_charge_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    damage_notes = models.TextField(blank=True, default="")
    gst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    owner_daily_amount_snapshot = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    owner_extra_km_percent_snapshot = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    owner_damage_percent_snapshot = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUS_CHOICES, default="pending")

    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="booked")
    closing_notes = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Rental #{self.id} - {self.customer.full_name} - {self.vehicle.registration_number}"

    @property
    def invoice_number(self):
        from settings_app.models import ApplicationSettings
        prefix = ApplicationSettings.load().invoice_prefix
        return f"{prefix}-{self.id:05d}"

    @property
    def balance_due(self):
        return q2(self.total_amount - self.amount_paid)

    def compute_base_amount_for_hours(self, hours_used: Decimal) -> Decimal:
        """
        Pro-rated billing: (hours_used / 24) * daily_rate, capped at the full
        booked-day count (i.e. early return never charges *more* than the
        originally booked days would have cost).
        """
        hours_used = Decimal(hours_used)
        per_day = Decimal(self.daily_rate_snapshot)
        prorated = (hours_used / Decimal(24)) * per_day
        max_amount = per_day * Decimal(self.booked_days)
        return q2(min(prorated, max_amount))

    def recalculate_pending_estimate(self):
        """
        Live estimate while the rental is still active - used by the frontend
        to show 'amount so far' before formal closing. Does not persist late
        fee / extra km since those are only known for sure at closing, but we
        can still show a running base estimate using current time.
        """
        if not self.actual_start:
            return q2(Decimal(self.daily_rate_snapshot) * self.booked_days)
        now = timezone.now()
        elapsed_hours = Decimal((now - self.actual_start).total_seconds()) / Decimal(3600)
        return self.compute_base_amount_for_hours(elapsed_hours)

    def close_rental(self, odometer_end: int, actual_end=None, damage_charge_amount=0, damage_notes=""):
        """
        Finalise the rental: compute base amount (pro-rated/capped), late fee,
        extra km charge, damage charge, GST, and total. Sets status to closed
        and marks the vehicle available again. Caller is responsible for
        saving the vehicle separately if needed (we do it here for atomicity
        at the call site via a transaction).
        """
        self.actual_end = actual_end or timezone.now()
        self.odometer_end = odometer_end

        # Late fee: half-day if returned within 6 hrs after scheduled_end (net of grace),
        # full day if beyond 6 hrs. Grace period is a free window inside the 6-hr band.
        late_delta = self.actual_end - self.scheduled_end
        grace = timezone.timedelta(minutes=int(self.grace_period_minutes_snapshot))
        if late_delta <= grace:
            self.late_fee_amount = Decimal("0.00")
        elif late_delta <= timezone.timedelta(hours=6):
            self.late_fee_amount = q2(Decimal(str(self.daily_rate_snapshot)) / 2)
        else:
            self.late_fee_amount = q2(Decimal(str(self.daily_rate_snapshot)))

        # Extra km
        km_covered = max((self.odometer_end or 0) - (self.odometer_start or 0), 0)
        extra_km = max(km_covered - self.free_km_total_snapshot, 0)
        self.extra_km_amount = q2(Decimal(extra_km) * Decimal(self.extra_km_charge_snapshot))

        self.damage_charge_amount = q2(Decimal(damage_charge_amount))
        self.damage_notes = damage_notes

        subtotal = self.base_amount + self.late_fee_amount + self.extra_km_amount + self.damage_charge_amount
        self.gst_amount = q2(subtotal * Decimal(self.gst_percent_snapshot) / Decimal(100))
        self.total_amount = q2(subtotal + self.gst_amount)

        self.status = "closed"
        self.closed_at = timezone.now()

        if self.amount_paid >= self.total_amount:
            self.payment_status = "paid"
        elif self.amount_paid > 0:
            self.payment_status = "partial"
        else:
            self.payment_status = "pending"

        self.save()

        self.vehicle.status = "available"
        self.vehicle.current_odometer = self.odometer_end
        self.vehicle.save(update_fields=["status", "current_odometer"])

        return self

    def km_covered(self):
        if self.odometer_start is None or self.odometer_end is None:
            return None
        return max(self.odometer_end - self.odometer_start, 0)

    @property
    def late_fee_type(self):
        """none / half_day / full_day — based on how late the vehicle was returned."""
        if not self.actual_end or not self.scheduled_end or not self.late_fee_amount:
            return None
        late_delta = self.actual_end - self.scheduled_end
        grace = timezone.timedelta(minutes=int(self.grace_period_minutes_snapshot or 0))
        if late_delta <= grace:
            return None
        return 'half_day' if late_delta <= timezone.timedelta(hours=6) else 'full_day'

    @property
    def computed_owner_payout(self):
        """Suggested owner payout for this rental based on VehicleOwnerRate snapshots."""
        if self.status != 'closed':
            return Decimal('0.00')
        owner_daily = Decimal(str(self.owner_daily_amount_snapshot))
        base_share = q2(owner_daily * self.booked_days)

        late_share = Decimal('0.00')
        if self.actual_end and self.scheduled_end and self.late_fee_amount:
            late_delta = self.actual_end - self.scheduled_end
            grace = timezone.timedelta(minutes=int(self.grace_period_minutes_snapshot or 0))
            if late_delta > grace:
                if late_delta <= timezone.timedelta(hours=6):
                    late_share = q2(owner_daily / 2)
                else:
                    late_share = q2(owner_daily)

        extra_km_share = q2(
            Decimal(str(self.extra_km_amount)) * Decimal(str(self.owner_extra_km_percent_snapshot)) / 100
        )
        damage_share = q2(
            Decimal(str(self.damage_charge_amount)) * Decimal(str(self.owner_damage_percent_snapshot)) / 100
        )
        return q2(base_share + late_share + extra_km_share + damage_share)


class RentalPayment(models.Model):
    """A single payment received from the customer against a rental."""
    METHOD_CHOICES = [
        ("cash", "Cash"),
        ("upi", "UPI"),
        ("card", "Card"),
        ("bank_transfer", "Bank Transfer"),
    ]

    rental = models.ForeignKey(Rental, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default="cash")
    paid_at = models.DateTimeField(auto_now_add=True)
    notes = models.CharField(max_length=200, blank=True, default="")

    class Meta:
        ordering = ["-paid_at"]

    def __str__(self):
        return f"Payment #{self.id} - {self.amount} for Rental #{self.rental_id}"


class OwnerPayout(models.Model):
    """
    A payout made by the admin to a car owner. Can be linked to a single
    rental, or be a 'collective' payout that clears the owner's outstanding
    balance across multiple rentals at once. Always reflected in Finance as
    an expense.
    """
    PAYOUT_TYPE_CHOICES = [
        ("single", "Single Rental"),
        ("collective", "Collective / Bulk"),
    ]

    owner = models.ForeignKey(CarOwner, on_delete=models.PROTECT, related_name="payouts")
    payout_type = models.CharField(max_length=12, choices=PAYOUT_TYPE_CHOICES, default="single")
    rentals = models.ManyToManyField(Rental, related_name="owner_payouts", blank=True)

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_at = models.DateTimeField(auto_now_add=True)
    notes = models.CharField(max_length=200, blank=True, default="")

    class Meta:
        ordering = ["-paid_at"]

    def __str__(self):
        return f"Payout #{self.id} - {self.amount} to {self.owner.name}"
