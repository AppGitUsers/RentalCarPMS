from decimal import Decimal

from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.utils.qr import generate_upi_qr_base64
from rentals.models import OwnerPayout
from rentals.services import compute_owner_outstanding_balance, compute_owner_share_for_rental, unpaid_rentals_for_owner

from .models import CarOwner
from .serializers import CarOwnerListSerializer, CarOwnerSerializer


class CarOwnerViewSet(viewsets.ModelViewSet):
    queryset = CarOwner.objects.all().order_by('name')
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'phone', 'email', 'upi_id']
    ordering_fields = ['name', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return CarOwnerListSerializer
        return CarOwnerSerializer

    @action(detail=True, methods=['get'])
    def payout_qr(self, request, pk=None):
        """
        Returns a dynamic UPI QR for paying this owner. Amount is taken from
        ?amount= query param (defaults to their current outstanding balance).
        """
        owner = self.get_object()
        amount = request.query_params.get('amount')
        if amount is None:
            amount = compute_owner_outstanding_balance(owner)
        try:
            amount = Decimal(str(amount))
        except Exception:
            return Response({'detail': 'Invalid amount.'}, status=status.HTTP_400_BAD_REQUEST)

        if not owner.upi_id:
            return Response({'detail': 'This owner has no UPI ID on file.'}, status=status.HTTP_400_BAD_REQUEST)

        qr_data_uri = generate_upi_qr_base64(
            owner.upi_id, owner.payee_display_name, amount,
            transaction_note=f"Payout to {owner.name}",
        )
        return Response({'qr_image': qr_data_uri, 'amount': str(amount), 'upi_id': owner.upi_id})

    @action(detail=True, methods=['get'])
    def unpaid_rentals(self, request, pk=None):
        owner = self.get_object()
        rentals = unpaid_rentals_for_owner(owner)
        data = [
            {
                'id': r.id,
                'invoice_number': r.invoice_number,
                'vehicle': r.vehicle.registration_number,
                'customer': r.customer.full_name,
                'closed_at': r.closed_at,
                'total_amount': r.total_amount,
                'owner_share_amount': compute_owner_share_for_rental(r),
            }
            for r in rentals
        ]
        return Response(data)

    @action(detail=True, methods=['post'])
    def pay_single(self, request, pk=None):
        """Pay the owner for ONE specific closed rental."""
        owner = self.get_object()
        rental_id = request.data.get('rental_id')
        notes = request.data.get('notes', '')
        from rentals.models import Rental
        try:
            rental = Rental.objects.get(id=rental_id, vehicle__owner=owner, status='closed')
        except Rental.DoesNotExist:
            return Response({'detail': 'Rental not found for this owner.'}, status=status.HTTP_404_NOT_FOUND)

        amount = compute_owner_share_for_rental(rental)
        with transaction.atomic():
            payout = OwnerPayout.objects.create(
                owner=owner, payout_type='single', amount=amount, notes=notes,
            )
            payout.rentals.add(rental)
        return Response({'detail': 'Payout recorded.', 'payout_id': payout.id, 'amount': str(amount)})

    @action(detail=True, methods=['post'])
    def pay_collective(self, request, pk=None):
        """Pay the owner a bulk amount clearing some/all of their outstanding unpaid rentals."""
        owner = self.get_object()
        rental_ids = request.data.get('rental_ids', [])
        notes = request.data.get('notes', '')
        amount_override = request.data.get('amount')

        from rentals.models import Rental
        rentals = Rental.objects.filter(id__in=rental_ids, vehicle__owner=owner, status='closed')
        if not rentals.exists():
            return Response({'detail': 'No valid rentals supplied.'}, status=status.HTTP_400_BAD_REQUEST)

        total = sum((compute_owner_share_for_rental(r) for r in rentals), Decimal('0.00'))
        amount = Decimal(str(amount_override)) if amount_override else total

        with transaction.atomic():
            payout = OwnerPayout.objects.create(
                owner=owner, payout_type='collective', amount=amount, notes=notes,
            )
            payout.rentals.set(list(rentals))
        return Response({'detail': 'Collective payout recorded.', 'payout_id': payout.id, 'amount': str(amount)})

    @action(detail=True, methods=['get'])
    def payout_history(self, request, pk=None):
        owner = self.get_object()
        payouts = owner.payouts.all().order_by('-paid_at')
        data = [
            {
                'id': p.id,
                'amount': p.amount,
                'payout_type': p.payout_type,
                'paid_at': p.paid_at,
                'notes': p.notes,
                'rental_ids': list(p.rentals.values_list('id', flat=True)),
            }
            for p in payouts
        ]
        return Response(data)

    @action(detail=True, methods=['get'])
    def rental_history(self, request, pk=None):
        """Past rental history for all vehicles owned by this owner."""
        owner = self.get_object()
        from rentals.models import Rental
        rentals = Rental.objects.filter(vehicle__owner=owner).order_by('-created_at')[:100]
        data = [
            {
                'id': r.id,
                'invoice_number': r.invoice_number,
                'vehicle': r.vehicle.registration_number,
                'customer': r.customer.full_name,
                'status': r.status,
                'total_amount': r.total_amount,
                'created_at': r.created_at,
            }
            for r in rentals
        ]
        return Response(data)
