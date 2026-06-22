from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Customer
from .serializers import CustomerListSerializer, CustomerSerializer


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
