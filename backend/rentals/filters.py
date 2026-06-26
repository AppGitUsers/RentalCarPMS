import django_filters
from .models import Rental


class RentalFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name='status')
    payment_status = django_filters.CharFilter(field_name='payment_status')
    payment_timing = django_filters.CharFilter(field_name='payment_timing')
    vehicle = django_filters.NumberFilter(field_name='vehicle')
    customer = django_filters.NumberFilter(field_name='customer')

    # Scheduled start range
    scheduled_start_after  = django_filters.DateFilter(field_name='scheduled_start', lookup_expr='date__gte')
    scheduled_start_before = django_filters.DateFilter(field_name='scheduled_start', lookup_expr='date__lte')

    # Scheduled end range
    scheduled_end_after  = django_filters.DateFilter(field_name='scheduled_end', lookup_expr='date__gte')
    scheduled_end_before = django_filters.DateFilter(field_name='scheduled_end', lookup_expr='date__lte')

    class Meta:
        model = Rental
        fields = [
            'status', 'payment_status', 'payment_timing', 'vehicle', 'customer',
            'scheduled_start_after', 'scheduled_start_before',
            'scheduled_end_after', 'scheduled_end_before',
        ]
