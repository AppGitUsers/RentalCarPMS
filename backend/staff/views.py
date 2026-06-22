from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Attendance, SalaryPayment, StaffMember
from .serializers import (
    AttendanceSerializer, SalaryPaymentSerializer, StaffMemberListSerializer,
    StaffMemberSerializer,
)
from .services import compute_or_refresh_salary


class StaffMemberViewSet(viewsets.ModelViewSet):
    queryset = StaffMember.objects.all().order_by('full_name')
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
        records = staff.attendance_records.all().order_by('-date')[:60]
        return Response(AttendanceSerializer(records, many=True).data)

    @action(detail=True, methods=['get'])
    def salary_history(self, request, pk=None):
        staff = self.get_object()
        records = staff.salary_payments.all().order_by('-year', '-month')
        return Response(SalaryPaymentSerializer(records, many=True).data)


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related('staff').all().order_by('-date')
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['staff', 'date', 'status']

    @action(detail=False, methods=['get'])
    def by_date(self, request):
        """All staff attendance for a single date - powers the daily attendance sheet view."""
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({'detail': 'date query param required (YYYY-MM-DD).'}, status=400)
        records = self.get_queryset().filter(date=date_str)
        return Response(AttendanceSerializer(records, many=True).data)

    def perform_create(self, serializer):
        serializer.save()
        # Auto-refresh the month's salary estimate whenever attendance changes.
        instance = serializer.instance
        compute_or_refresh_salary(instance.staff, instance.date.month, instance.date.year)

    def perform_update(self, serializer):
        serializer.save()
        instance = serializer.instance
        compute_or_refresh_salary(instance.staff, instance.date.month, instance.date.year)


class SalaryPaymentViewSet(viewsets.ModelViewSet):
    queryset = SalaryPayment.objects.select_related('staff').all().order_by('-year', '-month')
    serializer_class = SalaryPaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['staff', 'month', 'year', 'is_paid']

    @action(detail=False, methods=['get'])
    def for_month(self, request):
        """
        Returns every active staff member's salary row for the given
        month/year, computing/refreshing it first from attendance if not
        already paid. Powers the main staff payroll dashboard table.
        """
        month = int(request.query_params.get('month'))
        year = int(request.query_params.get('year'))

        results = []
        for staff in StaffMember.objects.filter(is_active=True):
            salary = compute_or_refresh_salary(staff, month, year)
            results.append(salary)

        return Response(SalaryPaymentSerializer(results, many=True).data)

    @action(detail=True, methods=['post'])
    def adjust(self, request, pk=None):
        """Apply a manual bonus/deduction before paying."""
        salary = self.get_object()
        if salary.is_paid:
            return Response({'detail': 'Cannot adjust an already-paid salary record.'}, status=400)
        adjustment = request.data.get('adjustment', 0)
        from decimal import Decimal
        salary.adjustment = Decimal(str(adjustment))
        salary.final_amount = salary.computed_amount + salary.adjustment
        salary.save(update_fields=['adjustment', 'final_amount'])
        return Response(SalaryPaymentSerializer(salary).data)

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        """The 'Pay' button - marks this month's salary as paid."""
        salary = self.get_object()
        if salary.is_paid:
            return Response({'detail': 'Already paid.'}, status=400)
        notes = request.data.get('notes', '')
        salary.is_paid = True
        salary.paid_at = timezone.now()
        if notes:
            salary.notes = notes
        salary.save(update_fields=['is_paid', 'paid_at', 'notes'])
        return Response(SalaryPaymentSerializer(salary).data)
