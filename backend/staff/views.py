from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Attendance, SalaryPayment, Shift, StaffMember
from .serializers import (
    AttendanceSerializer, SalaryPaymentSerializer, ShiftSerializer,
    StaffMemberListSerializer, StaffMemberSerializer,
)
from .services import compute_or_refresh_salary


class ShiftViewSet(viewsets.ModelViewSet):
    queryset = Shift.objects.all().order_by('start_time')
    serializer_class = ShiftSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active']


class StaffMemberViewSet(viewsets.ModelViewSet):
    queryset = StaffMember.objects.select_related('default_shift').all().order_by('full_name')
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['full_name', 'phone', 'email']

    def get_serializer_class(self):
        if self.action == 'list':
            return StaffMemberListSerializer
        return StaffMemberSerializer

    @action(detail=True, methods=['get'])
    def attendance_history(self, request, pk=None):
        staff = self.get_object()
        records = staff.attendance_records.select_related('shift').all().order_by('-date')[:60]
        return Response(AttendanceSerializer(records, many=True).data)

    @action(detail=True, methods=['get'])
    def salary_history(self, request, pk=None):
        staff = self.get_object()
        records = staff.salary_payments.all().order_by('-year', '-month')
        return Response(SalaryPaymentSerializer(records, many=True).data)


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related('staff', 'shift').all().order_by('-date')
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['staff', 'date', 'status']

    @action(detail=False, methods=['get'])
    def by_date(self, request):
        """All staff attendance for a single date — powers the daily attendance sheet."""
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({'detail': 'date query param required (YYYY-MM-DD).'}, status=400)
        records = self.get_queryset().filter(date=date_str)
        return Response(AttendanceSerializer(records, many=True).data)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def kiosk_punch(self, request):
        """No-auth endpoint for the staff kiosk terminal — handles check-in and check-out by employee ID."""
        staff_id = request.data.get('staff_id')
        if not staff_id:
            return Response({'detail': 'staff_id is required.'}, status=400)

        try:
            staff = StaffMember.objects.select_related('default_shift').get(pk=staff_id, is_active=True)
        except StaffMember.DoesNotExist:
            return Response({'detail': 'Employee not found. Please check your ID.'}, status=404)

        today = timezone.localtime(timezone.now()).date()
        now_time = timezone.localtime(timezone.now()).strftime('%H:%M')

        record = Attendance.objects.select_related('shift').filter(staff=staff, date=today).first()

        if record is None:
            record = Attendance.objects.create(
                staff=staff,
                date=today,
                status='present',
                shift=staff.default_shift,
                shift_in=now_time,
            )
            record.compute_shift_flags()
            record.save(update_fields=['is_late', 'overtime_hours'])
            compute_or_refresh_salary(staff, today.month, today.year)
            action_taken = 'checked_in'

        elif record.shift_out is None:
            if not record.shift_id and staff.default_shift_id:
                record.shift = staff.default_shift
            record.shift_out = now_time
            record.save(update_fields=['shift', 'shift_out'])
            record.compute_shift_flags()
            record.save(update_fields=['is_late', 'overtime_hours'])
            compute_or_refresh_salary(staff, today.month, today.year)
            action_taken = 'checked_out'

        else:
            return Response({
                'detail': 'already_complete',
                'shift_in': str(record.shift_in)[:5],
                'shift_out': str(record.shift_out)[:5],
                'hours_worked': record.hours_worked(),
            }, status=409)

        photo_url = request.build_absolute_uri(staff.photo.url) if staff.photo else None

        return Response({
            'action': action_taken,
            'staff_id': staff.id,
            'staff_name': staff.full_name,
            'staff_role': staff.role,
            'staff_photo': photo_url,
            'shift_name': staff.default_shift.name if staff.default_shift else None,
            'date': str(today),
            'shift_in': str(record.shift_in)[:5] if record.shift_in else None,
            'shift_out': str(record.shift_out)[:5] if record.shift_out else None,
            'hours_worked': record.hours_worked(),
            'is_late': record.is_late,
        })

    @action(detail=False, methods=['get'])
    def by_staff_month(self, request):
        """All attendance records for one staff member for a full month — powers the calendar view."""
        staff_id = request.query_params.get('staff')
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        if not (staff_id and month and year):
            return Response({'detail': 'staff, month, and year query params are required.'}, status=400)
        records = self.get_queryset().filter(
            staff_id=staff_id, date__month=int(month), date__year=int(year),
        ).order_by('date')
        return Response(AttendanceSerializer(records, many=True).data)

    def _apply_shift_and_save(self, serializer):
        instance = serializer.instance
        # Auto-assign the staff's default shift if none was explicitly provided.
        if not instance.shift_id and instance.staff.default_shift_id:
            instance.shift = instance.staff.default_shift
            instance.save(update_fields=['shift'])
        # Recompute late / OT flags from the shift template and actual clock times.
        instance.compute_shift_flags()
        instance.save(update_fields=['is_late', 'overtime_hours'])
        compute_or_refresh_salary(instance.staff, instance.date.month, instance.date.year)

    def perform_create(self, serializer):
        serializer.save()
        self._apply_shift_and_save(serializer)

    def perform_update(self, serializer):
        serializer.save()
        self._apply_shift_and_save(serializer)


class SalaryPaymentViewSet(viewsets.ModelViewSet):
    queryset = SalaryPayment.objects.select_related('staff').all().order_by('-year', '-month')
    serializer_class = SalaryPaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['staff', 'month', 'year', 'is_paid']

    @action(detail=False, methods=['get'])
    def for_month(self, request):
        month = int(request.query_params.get('month'))
        year = int(request.query_params.get('year'))
        results = []
        for staff in StaffMember.objects.select_related('default_shift').filter(is_active=True):
            salary = compute_or_refresh_salary(staff, month, year)
            results.append(salary)
        return Response(SalaryPaymentSerializer(results, many=True).data)

    @action(detail=True, methods=['post'])
    def adjust(self, request, pk=None):
        salary = self.get_object()
        if salary.is_paid:
            return Response({'detail': 'Cannot adjust an already-paid salary record.'}, status=400)
        from decimal import Decimal
        salary.adjustment = Decimal(str(request.data.get('adjustment', 0)))
        salary.final_amount = salary.computed_amount + salary.adjustment
        salary.save(update_fields=['adjustment', 'final_amount'])
        return Response(SalaryPaymentSerializer(salary).data)

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        salary = self.get_object()
        if salary.is_paid:
            return Response({'detail': 'Already paid.'}, status=400)
        salary.is_paid = True
        salary.paid_at = timezone.now()
        if request.data.get('notes'):
            salary.notes = request.data['notes']
        salary.save(update_fields=['is_paid', 'paid_at', 'notes'])
        return Response(SalaryPaymentSerializer(salary).data)
