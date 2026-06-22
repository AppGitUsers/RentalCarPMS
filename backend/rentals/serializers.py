from rest_framework import serializers

from customers.models import Customer
from customers.serializers import CustomerListSerializer
from vehicles.models import Vehicle
from vehicles.serializers import VehicleListSerializer

from .models import OwnerPayout, Rental, RentalPayment


class RentalPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RentalPayment
        fields = ['id', 'rental', 'amount', 'method', 'paid_at', 'notes']
        read_only_fields = ['id', 'paid_at']


class RentalListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    vehicle_registration = serializers.CharField(source='vehicle.registration_number', read_only=True)
    vehicle_display = serializers.SerializerMethodField()

    class Meta:
        model = Rental
        fields = [
            'id', 'invoice_number', 'customer', 'customer_name', 'customer_phone',
            'vehicle', 'vehicle_registration', 'vehicle_display', 'destination', 'purpose',
            'scheduled_start', 'scheduled_end', 'status', 'payment_status', 'payment_timing',
            'total_amount', 'amount_paid', 'created_at',
        ]

    def get_vehicle_display(self, obj):
        return f"{obj.vehicle.make} {obj.vehicle.model}"


class RentalDetailSerializer(serializers.ModelSerializer):
    customer_detail = CustomerListSerializer(source='customer', read_only=True)
    vehicle_detail = VehicleListSerializer(source='vehicle', read_only=True)
    payments = RentalPaymentSerializer(many=True, read_only=True)
    balance_due = serializers.SerializerMethodField()
    live_estimate = serializers.SerializerMethodField()
    km_covered = serializers.SerializerMethodField()

    class Meta:
        model = Rental
        fields = [
            'id', 'invoice_number', 'customer', 'customer_detail', 'vehicle', 'vehicle_detail',
            'number_of_vehicles', 'destination', 'purpose',
            'scheduled_start', 'scheduled_end', 'booked_days',
            'odometer_start', 'odometer_end', 'actual_start', 'actual_end',
            'payment_timing', 'security_deposit_collected', 'security_deposit_amount',
            'daily_rate_snapshot', 'gst_percent_snapshot', 'owner_share_percent_snapshot',
            'late_fee_per_hour_snapshot', 'extra_km_charge_snapshot', 'free_km_total_snapshot',
            'grace_period_minutes_snapshot',
            'base_amount', 'late_fee_amount', 'extra_km_amount', 'damage_charge_amount',
            'damage_notes', 'gst_amount', 'total_amount', 'amount_paid', 'payment_status',
            'status', 'closing_notes', 'created_at', 'updated_at', 'closed_at',
            'payments', 'balance_due', 'live_estimate', 'km_covered',
        ]
        read_only_fields = [
            'id', 'invoice_number', 'daily_rate_snapshot', 'gst_percent_snapshot',
            'owner_share_percent_snapshot', 'late_fee_per_hour_snapshot',
            'extra_km_charge_snapshot', 'free_km_total_snapshot', 'grace_period_minutes_snapshot',
            'base_amount', 'late_fee_amount', 'extra_km_amount', 'gst_amount', 'total_amount',
            'created_at', 'updated_at', 'closed_at', 'payments',
        ]

    def get_balance_due(self, obj):
        return obj.balance_due

    def get_live_estimate(self, obj):
        if obj.status in ('booked',):
            return obj.recalculate_pending_estimate()
        if obj.status == 'active':
            return obj.recalculate_pending_estimate()
        return obj.total_amount

    def get_km_covered(self, obj):
        return obj.km_covered()


class RentalCreateSerializer(serializers.ModelSerializer):
    """
    Handles the 3-step booking wizard payload in one shot:
    step 1 (customer - either customer_id of existing, or inline new customer
    fields), step 2 (vehicle + trip details), step 3 (payment timing +
    optional deposit). Pricing snapshot fields are filled server-side from
    current Settings/vehicle values at creation time.
    """
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(), source='customer', required=False, allow_null=True,
    )

    class Meta:
        model = Rental
        fields = [
            'customer_id', 'vehicle', 'number_of_vehicles', 'destination', 'purpose',
            'scheduled_start', 'scheduled_end', 'booked_days', 'odometer_start',
            'payment_timing', 'security_deposit_collected', 'security_deposit_amount',
        ]

    def create(self, validated_data):
        from settings_app.models import ApplicationSettings
        settings_obj = ApplicationSettings.load()
        vehicle = validated_data['vehicle']

        rental = Rental.objects.create(
            **validated_data,
            daily_rate_snapshot=vehicle.daily_rate,
            gst_percent_snapshot=settings_obj.gst_percent,
            owner_share_percent_snapshot=vehicle.effective_owner_share_percent(),
            late_fee_per_hour_snapshot=settings_obj.late_fee_per_hour,
            extra_km_charge_snapshot=settings_obj.extra_km_charge_per_km,
            free_km_total_snapshot=settings_obj.free_km_per_day * validated_data.get('booked_days', 1),
            grace_period_minutes_snapshot=settings_obj.grace_period_minutes,
            base_amount=vehicle.daily_rate * validated_data.get('booked_days', 1),
            total_amount=vehicle.daily_rate * validated_data.get('booked_days', 1),
        )
        # Recompute GST on the initial estimate too
        gst_amt = (rental.base_amount * rental.gst_percent_snapshot / 100)
        rental.gst_amount = round(gst_amt, 2)
        rental.total_amount = round(rental.base_amount + rental.gst_amount, 2)
        rental.save()
        return rental


class OwnerPayoutSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.name', read_only=True)

    class Meta:
        model = OwnerPayout
        fields = ['id', 'owner', 'owner_name', 'payout_type', 'rentals', 'amount', 'paid_at', 'notes']
        read_only_fields = ['id', 'paid_at']
