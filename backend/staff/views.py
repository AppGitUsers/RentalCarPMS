import logging

from django.utils import timezone
from django.utils.dateparse import parse_date
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import StaffAttendance, StaffMember, StaffPayment
from .serializers import (
    StaffAttendanceSerializer, StaffMemberListSerializer,
    StaffMemberSerializer, StaffPaymentSerializer,
)
from .services import CL_PER_MONTH, next_attendance_status, salary_summary

logger = logging.getLogger(__name__)


class StaffMemberViewSet(viewsets.ModelViewSet):
    queryset = StaffMember.objects.all().order_by('full_name')
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['full_name', 'phone']

    def get_serializer_class(self):
        if self.action == 'list':
            return StaffMemberListSerializer
        return StaffMemberSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        logger.info("Staff member added — #%s %s, role: %s, salary: %s", instance.id, instance.full_name, instance.role, instance.monthly_salary)

    def perform_update(self, serializer):
        instance = serializer.save()
        logger.info("Staff member updated — #%s %s, active: %s", instance.id, instance.full_name, instance.is_active)

    def perform_destroy(self, instance):
        logger.info("Staff member deleted — #%s %s", instance.id, instance.full_name)
        instance.delete()

    @action(detail=True, methods=['get'])
    def salary_summary(self, request, pk=None):
        staff = self.get_object()
        today = timezone.localdate()
        month = int(request.query_params.get('month', today.month))
        year = int(request.query_params.get('year', today.year))
        data = salary_summary(staff, year, month)
        if data is None:
            return Response({'detail': 'Staff had not joined yet in this month.'}, status=400)
        return Response(data)

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        staff = self.get_object()
        today = timezone.localdate()
        month = int(request.data.get('month', today.month))
        year = int(request.data.get('year', today.year))
        amount = request.data.get('amount')
        if not amount:
            return Response({'detail': 'amount is required.'}, status=400)
        notes = request.data.get('notes', '')

        summary = salary_summary(staff, year, month) or {}
        payment = StaffPayment.objects.create(
            staff=staff,
            year=year,
            month=month,
            working_days=summary.get('working_days', 0),
            absent_days=summary.get('absent_days', 0),
            cl_days=summary.get('cl_days', 0),
            deduction_days=summary.get('deduction_days', 0),
            amount=amount,
            notes=notes,
        )
        logger.info(
            "Salary payment recorded — %s: %s for %s/%s (present: %s, absent: %s)",
            staff.full_name, payment.amount, month, year,
            payment.working_days, payment.absent_days,
        )
        return Response(StaffPaymentSerializer(payment).data, status=201)

    @action(detail=True, methods=['get'])
    def payment_history(self, request, pk=None):
        staff = self.get_object()
        payments = staff.salary_payments.all()
        return Response(StaffPaymentSerializer(payments, many=True).data)


class StaffAttendanceViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def by_staff_month(self, request):
        staff_id = request.query_params.get('staff')
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        if not (staff_id and month and year):
            return Response({'detail': 'staff, month, and year are required.'}, status=400)
        records = StaffAttendance.objects.filter(
            staff_id=staff_id,
            date__year=int(year),
            date__month=int(month),
        ).order_by('date')
        return Response(StaffAttendanceSerializer(records, many=True).data)

    def toggle(self, request):
        staff_id = request.data.get('staff_id')
        date_str = request.data.get('date')
        if not (staff_id and date_str):
            return Response({'detail': 'staff_id and date are required.'}, status=400)

        try:
            staff = StaffMember.objects.get(pk=staff_id)
        except StaffMember.DoesNotExist:
            return Response({'detail': 'Staff not found.'}, status=404)

        day = parse_date(date_str)
        if not day:
            return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)

        mode = request.data.get('mode', 'normal')
        record = StaffAttendance.objects.filter(staff=staff, date=day).first()
        current_status = record.status if record else None

        if mode == 'auth_leave':
            if current_status == 'auth_leave':
                record.delete()
                new_status = None
            elif record:
                record.status = 'auth_leave'
                record.save(update_fields=['status'])
                new_status = 'auth_leave'
            else:
                StaffAttendance.objects.create(staff=staff, date=day, status='auth_leave')
                new_status = 'auth_leave'
        else:
            cl_used = StaffAttendance.objects.filter(
                staff=staff,
                date__year=day.year,
                date__month=day.month,
                status='cl',
            ).count()
            cl_available = max(0, CL_PER_MONTH - cl_used)
            effective_status = current_status if current_status != 'auth_leave' else None
            new_status = next_attendance_status(effective_status, cl_available)

            if new_status is None:
                if record:
                    record.delete()
            elif record:
                record.status = new_status
                record.save(update_fields=['status'])
            else:
                StaffAttendance.objects.create(staff=staff, date=day, status=new_status)

        logger.info(
            "Attendance toggled — %s on %s: %s → %s",
            staff.full_name, date_str, current_status or 'present', new_status or 'present',
        )
        return Response({'date': date_str, 'status': new_status})
