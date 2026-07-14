import logging

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Customer
from .serializers import CustomerListSerializer, CustomerSerializer

logger = logging.getLogger(__name__)


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['full_name', 'phone', 'email', 'id_proof_number', 'driving_license_number']
    ordering_fields = ['full_name', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return CustomerListSerializer
        return CustomerSerializer

    def create(self, request, *args, **kwargs):
        logger.info(
            "Customer create attempt — fields: %s | files: %s",
            list(request.data.keys()), list(request.FILES.keys()),
        )
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.error(
                "Customer create validation failed — errors: %s | files: %s",
                serializer.errors, list(request.FILES.keys()),
            )
            raise ValidationError(serializer.errors)
        try:
            self.perform_create(serializer)
        except Exception:
            logger.exception("Customer create raised an unexpected exception")
            raise
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        logger.info(
            "Customer update attempt — pk: %s | files: %s",
            kwargs.get('pk') or self.kwargs.get('pk'), list(request.FILES.keys()),
        )
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            logger.error(
                "Customer update validation failed — pk: %s | errors: %s | files: %s",
                instance.pk, serializer.errors, list(request.FILES.keys()),
            )
            raise ValidationError(serializer.errors)
        try:
            self.perform_update(serializer)
        except Exception:
            logger.exception("Customer update raised an unexpected exception — pk: %s", instance.pk)
            raise
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}
        return Response(serializer.data)

    def perform_create(self, serializer):
        instance = serializer.save()
        logger.info("Customer created — #%s %s (%s)", instance.id, instance.full_name, instance.phone)

    def perform_update(self, serializer):
        instance = serializer.save()
        logger.info("Customer updated — #%s %s", instance.id, instance.full_name)

    def perform_destroy(self, instance):
        logger.info("Customer deleted — #%s %s (%s)", instance.id, instance.full_name, instance.phone)
        instance.delete()

    @action(detail=True, methods=['get'])
    def rental_history(self, request, pk=None):
        customer = self.get_object()
        rentals = customer.rentals.all().order_by('-created_at')
        data = [
            {
                'id': r.id,
                'invoice_number': r.invoice_number,
                'vehicle': r.vehicle.registration_number,
                'status': r.status,
                'scheduled_start': r.scheduled_start,
                'scheduled_end': r.scheduled_end,
                'total_amount': r.total_amount,
                'payment_status': r.payment_status,
            }
            for r in rentals
        ]
        return Response(data)
