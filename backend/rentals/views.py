from decimal import Decimal

from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.utils.pdf import build_agreement_pdf, build_invoice_pdf
from core.utils.qr import generate_upi_qr_base64
from settings_app.models import ApplicationSettings

from .filters import RentalFilter
from .models import Rental, RentalPayment
from .serializers import (
    RentalCreateSerializer, RentalDetailSerializer, RentalListSerializer,
)


class RentalViewSet(viewsets.ModelViewSet):
    queryset = Rental.objects.select_related('customer', 'vehicle', 'vehicle__owner').all().order_by('-created_at')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = RentalFilter
    search_fields = ['customer__full_name', 'customer__phone', 'vehicle__registration_number', 'destination']
    ordering_fields = ['created_at', 'scheduled_start', 'scheduled_end', 'total_amount']

    def get_serializer_class(self):
        if self.action == 'list':
            return RentalListSerializer
        if self.action == 'create':
            return RentalCreateSerializer
        return RentalDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rental = serializer.save()
        return Response(RentalDetailSerializer(rental).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Marks the rental as active - the vehicle physically goes out. Sets actual_start, vehicle.status=rented."""
        rental = self.get_object()
        if rental.status != 'booked':
            return Response({'detail': 'Only a booked rental can be started.'}, status=400)

        odometer_start = request.data.get('odometer_start')
        with transaction.atomic():
            rental.actual_start = timezone.now()
            if odometer_start is not None:
                rental.odometer_start = odometer_start
            rental.status = 'active'
            rental.save()

            rental.vehicle.status = 'rented'
            if odometer_start is not None:
                rental.vehicle.current_odometer = odometer_start
            rental.vehicle.save(update_fields=['status', 'current_odometer'])

        return Response(RentalDetailSerializer(rental).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """
        Closes the rental: computes base/late/extra-km/damage/GST charges,
        marks the vehicle available again.
        Expects: odometer_end, optional damage_charge_amount, damage_notes, actual_end (ISO, optional).
        """
        rental = self.get_object()
        if rental.status != 'active':
            return Response({'detail': 'Only an active rental can be closed.'}, status=400)

        odometer_end = request.data.get('odometer_end')
        if odometer_end is None:
            return Response({'detail': 'odometer_end is required to close a rental.'}, status=400)

        damage_charge_amount = request.data.get('damage_charge_amount', 0)
        damage_notes = request.data.get('damage_notes', '')
        actual_end = request.data.get('actual_end')
        actual_end_dt = None
        if actual_end:
            from django.utils.dateparse import parse_datetime
            actual_end_dt = parse_datetime(actual_end)

        with transaction.atomic():
            rental.close_rental(
                odometer_end=int(odometer_end),
                actual_end=actual_end_dt,
                damage_charge_amount=Decimal(str(damage_charge_amount or 0)),
                damage_notes=damage_notes,
            )

        return Response(RentalDetailSerializer(rental).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        rental = self.get_object()
        if rental.status not in ('booked', 'active'):
            return Response({'detail': 'Cannot cancel a closed/cancelled rental.'}, status=400)
        with transaction.atomic():
            was_active = rental.status == 'active'
            rental.status = 'cancelled'
            rental.save()
            if was_active:
                rental.vehicle.status = 'available'
                rental.vehicle.save(update_fields=['status'])
        return Response(RentalDetailSerializer(rental).data)

    @action(detail=True, methods=['get'])
    def estimate(self, request, pk=None):
        """Live running-total estimate, used by frontend before closing to preview charges."""
        rental = self.get_object()
        estimate = rental.recalculate_pending_estimate()
        return Response({'estimated_base_amount': estimate})

    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        rental = self.get_object()
        amount = request.data.get('amount')
        method = request.data.get('method', 'cash')
        notes = request.data.get('notes', '')
        if not amount:
            return Response({'detail': 'amount is required.'}, status=400)

        with transaction.atomic():
            payment = RentalPayment.objects.create(
                rental=rental, amount=Decimal(str(amount)), method=method, notes=notes,
            )
            rental.amount_paid = rental.amount_paid + payment.amount
            if rental.amount_paid >= rental.total_amount and rental.total_amount > 0:
                rental.payment_status = 'paid'
            elif rental.amount_paid > 0:
                rental.payment_status = 'partial'
            rental.save(update_fields=['amount_paid', 'payment_status'])

        return Response(RentalDetailSerializer(rental).data)

    @action(detail=True, methods=['get'])
    def payment_qr(self, request, pk=None):
        """
        Dynamic UPI QR for the CUSTOMER to pay the company. Amount defaults
        to the current balance due, but can be overridden via ?amount=.
        Uses the company's own UPI details from Settings.
        """
        rental = self.get_object()
        settings_obj = ApplicationSettings.load()

        amount = request.query_params.get('amount')
        amount = Decimal(str(amount)) if amount else rental.balance_due

        company_upi = getattr(settings_obj, 'company_upi_id', '') or request.query_params.get('upi_id', '')
        if not company_upi:
            return Response({'detail': 'No company UPI ID configured in Settings.'}, status=400)

        qr_data_uri = generate_upi_qr_base64(
            company_upi, settings_obj.company_name, amount,
            transaction_note=f"Rental {rental.invoice_number}",
        )
        return Response({'qr_image': qr_data_uri, 'amount': str(amount)})

    @action(detail=True, methods=['get'])
    def invoice_pdf(self, request, pk=None):
        rental = self.get_object()
        settings_obj = ApplicationSettings.load()
        pdf_bytes = build_invoice_pdf(rental, settings_obj)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{rental.invoice_number}.pdf"'
        return response

    @action(detail=True, methods=['get'])
    def agreement_pdf(self, request, pk=None):
        rental = self.get_object()
        settings_obj = ApplicationSettings.load()
        pdf_bytes = build_agreement_pdf(rental, settings_obj)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Agreement-{rental.invoice_number}.pdf"'
        return response

    @action(detail=False, methods=['get'])
    def active_list(self, request):
        """Cars currently out - shown at the top of the rentals dashboard."""
        rentals = self.get_queryset().filter(status='active').order_by('scheduled_end')
        return Response(RentalListSerializer(rentals, many=True).data)

    @action(detail=False, methods=['get'])
    def pending_list(self, request):
        rentals = self.get_queryset().filter(status='booked').order_by('scheduled_start')
        return Response(RentalListSerializer(rentals, many=True).data)
