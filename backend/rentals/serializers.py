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
    late_fee_type = serializers.CharField(read_only=True)
    computed_owner_payout = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Rental
        fields = [
            'id', 'invoice_number', 'customer', 'customer_detail', 'vehicle', 'vehicle_detail',
            'number_of_vehicles', 'destination', 'purpose',
            'scheduled_start', 'scheduled_end', 'booked_days',
            'odometer_start', 'odometer_end', 'actual_start', 'actual_end',
            'payment_timing', 'security_deposit_collected', 'security_deposit_amount',
            'daily_rate_snapshot', 'gst_percent_snapshot',
            'extra_km_charge_snapshot', 'free_km_total_snapshot', 'grace_period_minutes_snapshot',
            'owner_daily_amount_snapshot', 'owner_extra_km_percent_snapshot', 'owner_damage_percent_snapshot',
            'base_amount', 'late_fee_amount', 'late_fee_type', 'extra_km_amount', 'damage_charge_amount',
            'damage_notes', 'gst_amount', 'total_amount', 'amount_paid', 'payment_status',
            'status', 'closing_notes', 'created_at', 'updated_at', 'closed_at',
            'payments', 'balance_due', 'live_estimate', 'km_covered', 'computed_owner_payout',
        ]
        read_only_fields = [
            'id', 'invoice_number', 'daily_rate_snapshot', 'gst_percent_snapshot',
            'extra_km_charge_snapshot', 'free_km_total_snapshot', 'grace_period_minutes_snapshot',
            'owner_daily_amount_snapshot', 'owner_extra_km_percent_snapshot', 'owner_damage_percent_snapshot',
            'base_amount', 'late_fee_amount', 'extra_km_amount', 'gst_amount', 'total_amount',
            'created_at', 'updated_at', 'closed_at', 'payments',
        ]

    def get_balance_due(self, obj):
        return obj.balance_due

    def get_live_estimate(self, obj):
        if obj.status in ('booked', 'active'):
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
    daily_rate = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, write_only=True)

    class Meta:
        model = Rental
        fields = [
            'customer_id', 'vehicle', 'destination', 'purpose',
            'scheduled_start', 'scheduled_end', 'booked_days', 'odometer_start',
            'payment_timing', 'security_deposit_collected', 'security_deposit_amount',
            'daily_rate',
        ]

    def create(self, validated_data):
        from settings_app.models import ApplicationSettings
        from vehicles.models import VehicleOwnerRate
        settings_obj = ApplicationSettings.load()
        vehicle = validated_data['vehicle']
        booked_days = validated_data.get('booked_days', 1)
        daily_rate_override = validated_data.pop('daily_rate', None)

        try:
            rate_config = VehicleOwnerRate.objects.get(vehicle=vehicle)
        except VehicleOwnerRate.DoesNotExist:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError(
                {'vehicle': 'No owner rate configured for this vehicle. Please set it up in Vehicles → Rate Config first.'}
            )

        effective_daily_rate = daily_rate_override if daily_rate_override is not None else rate_config.vehicle_daily_rate
        base_amount = effective_daily_rate * booked_days
        rental = Rental.objects.create(
            **validated_data,
            daily_rate_snapshot=effective_daily_rate,
            gst_percent_snapshot=settings_obj.gst_percent,
            extra_km_charge_snapshot=settings_obj.extra_km_charge_per_km,
            free_km_total_snapshot=settings_obj.free_km_per_day * booked_days,
            grace_period_minutes_snapshot=settings_obj.grace_period_minutes,
            owner_daily_amount_snapshot=rate_config.owner_daily_amount,
            owner_extra_km_percent_snapshot=rate_config.owner_extra_km_percent,
            owner_damage_percent_snapshot=rate_config.owner_damage_percent,
            base_amount=base_amount,
            total_amount=base_amount,
        )
        gst_amt = rental.base_amount * rental.gst_percent_snapshot / 100
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
