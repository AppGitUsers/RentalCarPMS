from rest_framework import serializers

from .models import Attendance, SalaryPayment, StaffMember


class StaffMemberSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = StaffMember
        fields = [
            'id', 'full_name', 'phone', 'email', 'role', 'photo', 'monthly_salary',
            'date_joined', 'is_active', 'address', 'id_proof_number', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StaffMemberListSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffMember
        fields = ['id', 'full_name', 'phone', 'role', 'photo', 'monthly_salary', 'is_active']


class AttendanceSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.full_name', read_only=True)
    hours_worked = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = [
            'id', 'staff', 'staff_name', 'date', 'status', 'shift_in', 'shift_out',
            'notes', 'hours_worked', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_hours_worked(self, obj):
        return obj.hours_worked()


class SalaryPaymentSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.full_name', read_only=True)
    staff_role = serializers.CharField(source='staff.role', read_only=True)
    staff_photo = serializers.ImageField(source='staff.photo', read_only=True)

    class Meta:
        model = SalaryPayment
        fields = [
            'id', 'staff', 'staff_name', 'staff_role', 'staff_photo', 'month', 'year',
            'days_present', 'total_hours_worked', 'expected_hours', 'computed_amount',
            'adjustment', 'final_amount', 'is_paid', 'paid_at', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'days_present', 'total_hours_worked', 'expected_hours',
            'computed_amount', 'final_amount', 'paid_at', 'created_at', 'updated_at',
        ]
