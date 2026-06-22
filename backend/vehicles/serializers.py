from rest_framework import serializers

from owners.models import CarOwner

from .models import Vehicle, VehicleImage


class VehicleImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleImage
        fields = ['id', 'image', 'caption', 'uploaded_at']


class OwnerMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarOwner
        fields = ['id', 'name', 'phone', 'upi_id']


class VehicleSerializer(serializers.ModelSerializer):
    owner_detail = OwnerMiniSerializer(source='owner', read_only=True)
    gallery_images = VehicleImageSerializer(many=True, read_only=True)
    effective_owner_share_percent = serializers.SerializerMethodField()
    active_rental = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'owner', 'owner_detail', 'registration_number', 'make', 'model', 'year',
            'color', 'seating_capacity', 'fuel_type', 'transmission', 'primary_photo',
            'daily_rate', 'owner_share_percent_override', 'effective_owner_share_percent',
            'current_odometer', 'status', 'insurance_expiry', 'permit_expiry',
            'fitness_expiry', 'rc_number', 'notes', 'is_active', 'created_at', 'updated_at',
            'gallery_images', 'active_rental',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_effective_owner_share_percent(self, obj):
        return obj.effective_owner_share_percent()

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

    class Meta:
        model = Vehicle
        fields = [
            'id', 'registration_number', 'make', 'model', 'year', 'primary_photo',
            'daily_rate', 'status', 'owner_name', 'current_odometer',
        ]
