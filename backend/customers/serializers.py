from rest_framework import serializers

from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    rental_count = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id', 'full_name', 'phone', 'alternate_phone', 'email', 'address',
            'id_proof_type', 'id_proof_number', 'id_proof_photo_front', 'id_proof_photo_back',
            'driving_license_number', 'driving_license_photo', 'customer_photo',
            'notes', 'created_at', 'updated_at', 'rental_count',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_rental_count(self, obj):
        return obj.rentals.count()


class CustomerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'full_name', 'phone', 'email', 'id_proof_type', 'id_proof_number', 'customer_photo']
