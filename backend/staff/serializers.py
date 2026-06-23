from rest_framework import serializers

from .models import Attendance, SalaryPayment, Shift, StaffMember


class ShiftSerializer(serializers.ModelSerializer):
    shift_hours = serializers.SerializerMethodField()
    working_days_display = serializers.SerializerMethodField()

    class Meta:
        model = Shift
        fields = [
            'id', 'name', 'start_time', 'end_time',
            'late_grace_minutes', 'ot_grace_minutes',
            'work_mon', 'work_tue', 'work_wed', 'work_thu', 'work_fri', 'work_sat', 'work_sun',
            'is_active', 'shift_hours', 'working_days_display',
        ]
        read_only_fields = ['id', 'shift_hours', 'working_days_display']

    def get_shift_hours(self, obj):
        return obj.shift_hours()

    def get_working_days_display(self, obj):
        return obj.working_days_display


class StaffMemberSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True, required=False)
    default_shift_detail = ShiftSerializer(source='default_shift', read_only=True)

    class Meta:
        model = StaffMember
        fields = [
            'id', 'full_name', 'phone', 'email', 'role', 'photo', 'monthly_salary',
            'date_joined', 'is_active', 'default_shift', 'default_shift_detail',
            'address', 'id_proof_number', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'default_shift_detail']


class StaffMemberListSerializer(serializers.ModelSerializer):
    default_shift_detail = ShiftSerializer(source='default_shift', read_only=True)

    class Meta:
        model = StaffMember
        fields = ['id', 'full_name', 'phone', 'role', 'photo', 'monthly_salary', 'is_active', 'default_shift', 'default_shift_detail']


class AttendanceSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.full_name', read_only=True)
    hours_worked = serializers.SerializerMethodField()
    shift_detail = ShiftSerializer(source='shift', read_only=True)

    class Meta:
        model = Attendance
        fields = [
            'id', 'staff', 'staff_name', 'date', 'status',
            'shift', 'shift_detail', 'shift_in', 'shift_out',
            'is_late', 'overtime_hours', 'notes', 'hours_worked', 'created_at',
        ]
        read_only_fields = ['id', 'is_late', 'overtime_hours', 'created_at', 'shift_detail']

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
            'days_present', 'total_hours_worked', 'expected_hours',
            'late_count', 'overtime_hours_total',
            'computed_amount', 'adjustment', 'final_amount',
            'is_paid', 'paid_at', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'days_present', 'total_hours_worked', 'expected_hours',
            'late_count', 'overtime_hours_total',
            'computed_amount', 'final_amount', 'paid_at', 'created_at', 'updated_at',
        ]
