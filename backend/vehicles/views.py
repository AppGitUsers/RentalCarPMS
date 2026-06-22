from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Vehicle, VehicleImage
from .serializers import VehicleImageSerializer, VehicleListSerializer, VehicleSerializer


class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.select_related('owner').all().order_by('registration_number')
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'owner', 'fuel_type', 'transmission', 'is_active']
    search_fields = ['registration_number', 'make', 'model', 'owner__name']
    ordering_fields = ['registration_number', 'daily_rate', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return VehicleListSerializer
        return VehicleSerializer

    @action(detail=False, methods=['get'])
    def status_summary(self, request):
        """Counts by status, used for the categorized available/rented widgets."""
        qs = self.get_queryset().filter(is_active=True)
        return Response({
            'available': qs.filter(status='available').count(),
            'rented': qs.filter(status='rented').count(),
            'maintenance': qs.filter(status='maintenance').count(),
            'total': qs.count(),
        })

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_gallery_image(self, request, pk=None):
        vehicle = self.get_object()
        image = request.data.get('image')
        caption = request.data.get('caption', '')
        if not image:
            return Response({'detail': 'image file required.'}, status=400)
        img = VehicleImage.objects.create(vehicle=vehicle, image=image, caption=caption)
        return Response(VehicleImageSerializer(img).data, status=201)

    @action(detail=True, methods=['delete'], url_path='gallery_image/(?P<image_id>[^/.]+)')
    def delete_gallery_image(self, request, pk=None, image_id=None):
        VehicleImage.objects.filter(id=image_id, vehicle_id=pk).delete()
        return Response(status=204)

    @action(detail=True, methods=['get'])
    def rental_history(self, request, pk=None):
        vehicle = self.get_object()
        rentals = vehicle.rentals.all().order_by('-created_at')[:100]
        data = [
            {
                'id': r.id,
                'invoice_number': r.invoice_number,
                'customer': r.customer.full_name,
                'status': r.status,
                'scheduled_start': r.scheduled_start,
                'scheduled_end': r.scheduled_end,
                'total_amount': r.total_amount,
            }
            for r in rentals
        ]
        return Response(data)

    @action(detail=False, methods=['get'])
    def upcoming_arrivals(self, request):
        """Vehicles currently rented out, ordered by soonest scheduled return - 'arriving shortly'."""
        from rentals.models import Rental
        active = Rental.objects.filter(status='active').select_related('vehicle', 'customer').order_by('scheduled_end')[:20]
        data = [
            {
                'rental_id': r.id,
                'vehicle_id': r.vehicle.id,
                'registration_number': r.vehicle.registration_number,
                'make': r.vehicle.make,
                'model': r.vehicle.model,
                'customer': r.customer.full_name,
                'scheduled_end': r.scheduled_end,
                'destination': r.destination,
            }
            for r in active
        ]
        return Response(data)
