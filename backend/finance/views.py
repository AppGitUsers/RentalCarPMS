import logging

from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils.excel import build_finance_excel

from .models import FinanceEntry
from .serializers import FinanceEntrySerializer
from .services import get_finance_summary, get_monthly_trend

logger = logging.getLogger(__name__)


class FinanceEntryViewSet(viewsets.ModelViewSet):
    queryset = FinanceEntry.objects.all().order_by('-date')
    serializer_class = FinanceEntrySerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['entry_type', 'category']
    search_fields = ['title', 'notes']
    ordering_fields = ['date', 'amount']

    def perform_create(self, serializer):
        instance = serializer.save()
        logger.info("Finance entry added — %s: %s %s (%s)", instance.entry_type, instance.amount, instance.title, instance.date)

    def perform_update(self, serializer):
        instance = serializer.save()
        logger.info("Finance entry updated — #%s %s %s", instance.id, instance.entry_type, instance.title)

    def perform_destroy(self, instance):
        logger.info("Finance entry deleted — #%s %s %s", instance.id, instance.entry_type, instance.title)
        instance.delete()


class FinanceSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        month = int(request.query_params.get('month'))
        year = int(request.query_params.get('year'))
        return Response(get_finance_summary(month, year))


class FinanceTrendView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        year = int(request.query_params.get('year'))
        return Response(get_monthly_trend(year))


class FinanceExcelExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from rentals.models import OwnerPayout, Rental
        from staff.models import StaffPayment

        month = int(request.query_params.get('month'))
        year = int(request.query_params.get('year'))

        rentals_qs = Rental.objects.select_related('customer', 'vehicle').filter(
            created_at__year=year, created_at__month=month,
        ).exclude(status='cancelled').order_by('created_at')

        income_entries = FinanceEntry.objects.filter(
            entry_type='income', date__year=year, date__month=month,
        )
        expense_entries = FinanceEntry.objects.filter(
            entry_type='expense', date__year=year, date__month=month,
        )
        owner_payouts = OwnerPayout.objects.select_related('owner').filter(
            paid_at__year=year, paid_at__month=month,
        )
        salary_payments = StaffPayment.objects.select_related('staff').filter(
            paid_at__year=year, paid_at__month=month,
        )

        try:
            excel_bytes = build_finance_excel(
                rentals_qs, expense_entries, owner_payouts, salary_payments,
                income_entries=income_entries, month=month, year=year,
            )
        except Exception:
            logger.exception("Finance Excel export failed for %s/%s", month, year)
            raise
        logger.info(
            "Finance Excel exported — %s/%s: %s rentals, %s income entries, %s expenses, %s owner payouts, %s salary payments",
            month, year, rentals_qs.count(), income_entries.count(), expense_entries.count(), owner_payouts.count(), salary_payments.count(),
        )
        response = HttpResponse(excel_bytes, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="Finance_Report_{month}_{year}.xlsx"'
        return response


class FinanceDateRangeExcelExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils.dateparse import parse_date
        from rentals.models import OwnerPayout, Rental
        from staff.models import StaffPayment

        date_from = parse_date(request.query_params.get('date_from', ''))
        date_to   = parse_date(request.query_params.get('date_to', ''))
        if not date_from or not date_to:
            return Response({'detail': 'date_from and date_to are required (YYYY-MM-DD).'}, status=400)

        rentals_qs = Rental.objects.select_related('customer', 'vehicle').filter(
            created_at__date__gte=date_from, created_at__date__lte=date_to,
        ).exclude(status='cancelled').order_by('created_at')

        income_entries = FinanceEntry.objects.filter(
            entry_type='income', date__gte=date_from, date__lte=date_to,
        )
        expense_entries = FinanceEntry.objects.filter(
            entry_type='expense', date__gte=date_from, date__lte=date_to,
        )
        owner_payouts = OwnerPayout.objects.select_related('owner').filter(
            paid_at__date__gte=date_from, paid_at__date__lte=date_to,
        )
        salary_payments = StaffPayment.objects.select_related('staff').filter(
            paid_at__date__gte=date_from, paid_at__date__lte=date_to,
        )

        label = f"{date_from.strftime('%d%b%Y')}_to_{date_to.strftime('%d%b%Y')}"
        try:
            excel_bytes = build_finance_excel(
                rentals_qs, expense_entries, owner_payouts, salary_payments,
                income_entries=income_entries, label=label,
            )
        except Exception:
            logger.exception("Finance Excel range export failed for %s to %s", date_from, date_to)
            raise
        logger.info(
            "Finance Excel range exported — %s to %s: %s rentals, %s income entries, %s expenses",
            date_from, date_to, rentals_qs.count(), income_entries.count(), expense_entries.count(),
        )
        response = HttpResponse(excel_bytes, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="Finance_Report_{label}.xlsx"'
        return response
