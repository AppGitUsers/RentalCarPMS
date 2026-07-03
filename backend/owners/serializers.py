from rest_framework import serializers

from vehicles.models import Vehicle, VehicleOwnerRate

from .models import CarOwner


class CarOwnerVehicleMiniSerializer(serializers.ModelSerializer):
    vehicle_daily_rate = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = ['id', 'registration_number', 'make', 'model', 'status', 'primary_photo', 'vehicle_daily_rate']

    def get_vehicle_daily_rate(self, obj):
        try:
            return obj.owner_rate.vehicle_daily_rate
        except VehicleOwnerRate.DoesNotExist:
            return None


class CarOwnerSerializer(serializers.ModelSerializer):
    vehicle_count = serializers.SerializerMethodField()
    vehicles = CarOwnerVehicleMiniSerializer(many=True, read_only=True)
    outstanding_balance = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = CarOwner
        fields = [
            'id', 'name', 'phone', 'alternate_phone', 'email', 'address',
            'upi_id', 'upi_payee_name',
            'id_proof_number', 'id_proof_photo', 'notes', 'is_active',
            'created_at', 'updated_at', 'vehicle_count', 'vehicles', 'outstanding_balance',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_vehicle_count(self, obj):
        return obj.vehicles.count()

    def get_outstanding_balance(self, obj):
        from rentals.services import compute_owner_outstanding_balance
        return compute_owner_outstanding_balance(obj)


class CarOwnerListSerializer(serializers.ModelSerializer):
    vehicle_count = serializers.SerializerMethodField()
    outstanding_balance = serializers.SerializerMethodField()

    class Meta:
        model = CarOwner
        fields = [
            'id', 'name', 'phone', 'email', 'upi_id',
            'is_active', 'vehicle_count', 'outstanding_balance',
        ]

    def get_vehicle_count(self, obj):
        return obj.vehicles.count()

    def get_outstanding_balance(self, obj):
        from rentals.services import compute_owner_outstanding_balance
        return compute_owner_outstanding_balance(obj)
