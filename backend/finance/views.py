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


class FinanceEntryViewSet(viewsets.ModelViewSet):
    queryset = FinanceEntry.objects.all().order_by('-date')
    serializer_class = FinanceEntrySerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['entry_type', 'category']
    search_fields = ['title', 'notes']
    ordering_fields = ['date', 'amount']


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
        from staff.models import SalaryPayment

        month = int(request.query_params.get('month'))
        year = int(request.query_params.get('year'))

        rentals_qs = Rental.objects.select_related('customer', 'vehicle').filter(
            created_at__year=year, created_at__month=month,
        ).exclude(status='cancelled').order_by('created_at')

        expense_entries = FinanceEntry.objects.filter(
            entry_type='expense', date__year=year, date__month=month,
        )
        owner_payouts = OwnerPayout.objects.select_related('owner').filter(
            paid_at__year=year, paid_at__month=month,
        )
        salary_payments = SalaryPayment.objects.select_related('staff').filter(
            paid_at__year=year, paid_at__month=month, is_paid=True,
        )

        excel_bytes = build_finance_excel(rentals_qs, expense_entries, owner_payouts, salary_payments, month, year)
        response = HttpResponse(excel_bytes, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="Finance_Report_{month}_{year}.xlsx"'
        return response


class FinanceDateRangeExcelExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils.dateparse import parse_date
        from rentals.models import OwnerPayout, Rental
        from staff.models import SalaryPayment

        date_from = parse_date(request.query_params.get('date_from', ''))
        date_to   = parse_date(request.query_params.get('date_to', ''))
        if not date_from or not date_to:
            return Response({'detail': 'date_from and date_to are required (YYYY-MM-DD).'}, status=400)

        rentals_qs = Rental.objects.select_related('customer', 'vehicle').filter(
            created_at__date__gte=date_from, created_at__date__lte=date_to,
        ).exclude(status='cancelled').order_by('created_at')

        expense_entries = FinanceEntry.objects.filter(
            entry_type='expense', date__gte=date_from, date__lte=date_to,
        )
        owner_payouts = OwnerPayout.objects.select_related('owner').filter(
            paid_at__date__gte=date_from, paid_at__date__lte=date_to,
        )
        salary_payments = SalaryPayment.objects.select_related('staff').filter(
            paid_at__date__gte=date_from, paid_at__date__lte=date_to, is_paid=True,
        )

        label = f"{date_from.strftime('%d%b%Y')}_to_{date_to.strftime('%d%b%Y')}"
        excel_bytes = build_finance_excel(
            rentals_qs, expense_entries, owner_payouts, salary_payments,
            label=label,
        )
        response = HttpResponse(excel_bytes, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="Finance_Report_{label}.xlsx"'
        return response
