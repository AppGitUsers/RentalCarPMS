from rest_framework import serializers

from core.utils.fields import LenientImageField
from owners.models import CarOwner

from .models import Vehicle, VehicleImage, VehicleOwnerRate


class VehicleImageSerializer(serializers.ModelSerializer):
    image = LenientImageField()

    class Meta:
        model = VehicleImage
        fields = ['id', 'image', 'caption', 'uploaded_at']


class OwnerMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarOwner
        fields = ['id', 'name', 'phone', 'upi_id']


class VehicleOwnerRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleOwnerRate
        fields = [
            'id', 'vehicle_daily_rate', 'owner_daily_amount',
            'owner_extra_km_percent', 'owner_damage_percent', 'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']


class VehicleSerializer(serializers.ModelSerializer):
    owner_detail = OwnerMiniSerializer(source='owner', read_only=True)
    gallery_images = VehicleImageSerializer(many=True, read_only=True)
    active_rental = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(default=True, required=False)
    owner_rate = VehicleOwnerRateSerializer(read_only=True)
    primary_photo = LenientImageField(required=False, allow_null=True)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'owner', 'owner_detail', 'registration_number', 'make', 'model', 'year',
            'color', 'seating_capacity', 'fuel_type', 'transmission', 'primary_photo',
            'current_odometer', 'status', 'insurance_expiry', 'permit_expiry',
            'fitness_expiry', 'rc_number', 'notes', 'is_active', 'created_at', 'updated_at',
            'gallery_images', 'active_rental', 'owner_rate',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_active_rental(self, obj):
        active = obj.rentals.filter(status='active').first()
        if not active:
            return None
        return {
            'id': active.id,
            'customer': active.customer.full_name,
            'scheduled_end': active.scheduled_end,
            'destination': active.destination,
        }


class VehicleListSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.name', read_only=True)
    vehicle_daily_rate = serializers.SerializerMethodField()
    next_booking_start = serializers.SerializerMethodField()
    next_booking_customer = serializers.SerializerMethodField()
    future_bookings = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            'id', 'registration_number', 'make', 'model', 'year', 'primary_photo',
            'vehicle_daily_rate', 'status', 'owner_name', 'current_odometer',
            'next_booking_start', 'next_booking_customer', 'future_bookings',
        ]

    def get_vehicle_daily_rate(self, obj):
        try:
            return obj.owner_rate.vehicle_daily_rate
        except VehicleOwnerRate.DoesNotExist:
            return None

    def get_next_booking_start(self, obj):
        # Present when the queryset was annotated (vehicle list action); None otherwise.
        return getattr(obj, 'next_booking_start', None)

    def get_next_booking_customer(self, obj):
        return getattr(obj, 'next_booking_customer', None)

    def get_future_bookings(self, obj):
        bookings = getattr(obj, 'future_bookings_prefetch', None)
        if not bookings:
            return []
        return [
            {'scheduled_start': b.scheduled_start, 'scheduled_end': b.scheduled_end}
            for b in bookings
        ]
