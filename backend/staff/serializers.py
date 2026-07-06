from rest_framework import serializers

from .models import StaffAttendance, StaffMember, StaffPayment


class StaffMemberSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = StaffMember
        fields = [
            'id', 'full_name', 'phone', 'role', 'photo', 'monthly_salary',
            'date_joined', 'is_active', 'address', 'id_proof_number', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StaffMemberListSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffMember
        fields = ['id', 'full_name', 'phone', 'role', 'photo', 'monthly_salary', 'date_joined', 'is_active']


class StaffAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffAttendance
        fields = ['id', 'staff', 'date', 'status']
        read_only_fields = ['id']


class StaffPaymentSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.full_name', read_only=True)

    class Meta:
        model = StaffPayment
        fields = [
            'id', 'staff', 'staff_name', 'year', 'month',
            'working_days', 'absent_days', 'cl_days', 'deduction_days',
            'amount', 'paid_at', 'notes',
        ]
        read_only_fields = ['id', 'paid_at', 'staff_name']
