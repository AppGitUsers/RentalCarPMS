from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class DashboardOverviewView(APIView):
    """
    The single landing-page summary: vehicle status counts, today's
    activity, this month's finance snapshot, and quick alerts (e.g.
    documents expiring soon, rentals overdue for return).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from finance.services import get_finance_summary
        from rentals.models import Rental
        from vehicles.models import Vehicle, VehicleOwnerRate
        from staff.models import StaffMember
        from owners.models import CarOwner
        from settings_app.models import ApplicationSettings
        from django.db.models import Exists, OuterRef
        from django.utils import timezone

        today = timezone.now().date()

        vehicles_qs = Vehicle.objects.filter(is_active=True)
        vehicle_status = {
            'available': vehicles_qs.filter(status='available').count(),
            'rented': vehicles_qs.filter(status='rented').count(),
            'maintenance': vehicles_qs.filter(status='maintenance').count(),
            'total': vehicles_qs.count(),
        }

        now = timezone.now()
        day_end = timezone.localtime(now).replace(hour=23, minute=59, second=59, microsecond=999999)
        settings_obj = ApplicationSettings.load()
        buffer = timezone.timedelta(hours=settings_obj.booking_buffer_hours)
        conflict_qs = Rental.objects.filter(
            vehicle=OuterRef('pk'),
            status__in=['booked', 'active'],
            scheduled_start__lt=day_end + buffer,
            scheduled_end__gt=now - buffer,
        )
        available_today_qs = (
            vehicles_qs.exclude(status='maintenance')
            .exclude(Exists(conflict_qs))
            .select_related('owner_rate')
            .order_by('registration_number')
        )
        available_today_vehicles = []
        for v in available_today_qs:
            try:
                daily_rate = v.owner_rate.vehicle_daily_rate
            except VehicleOwnerRate.DoesNotExist:
                daily_rate = None
            available_today_vehicles.append({
                'id': v.id,
                'registration_number': v.registration_number,
                'make': v.make,
                'model': v.model,
                'primary_photo': request.build_absolute_uri(v.primary_photo.url) if v.primary_photo else None,
                'vehicle_daily_rate': daily_rate,
            })

        active_rentals = Rental.objects.filter(status='active').count()
        booked_rentals = Rental.objects.filter(status='booked').count()

        overdue_rentals = Rental.objects.filter(status='active', scheduled_end__lt=now).count()

        upcoming_bookings_qs = list(
            Rental.objects.filter(status='booked', scheduled_start__gt=now)
            .select_related('vehicle', 'customer')
            .order_by('scheduled_start')
            .values(
                'id', 'scheduled_start', 'booked_days',
                'vehicle__registration_number', 'vehicle__make', 'vehicle__model',
                'customer__full_name',
            )
        )
        for b in upcoming_bookings_qs:
            hours_away = (b['scheduled_start'] - now).total_seconds() / 3600
            b['hours_until_start'] = round(hours_away, 1)
            b['is_soon'] = hours_away < 24

        finance_snapshot = get_finance_summary(today.month, today.year) if request.user.role == 'admin' else None

        from datetime import timedelta
        soon = today + timedelta(days=30)
        expiring_docs = []
        for v in vehicles_qs.filter(is_active=True):
            for field, label in [
                ('insurance_expiry', 'Insurance'),
                ('permit_expiry', 'Permit'),
                ('fitness_expiry', 'Fitness Certificate'),
            ]:
                val = getattr(v, field)
                if val and today <= val <= soon:
                    expiring_docs.append({
                        'vehicle': v.registration_number, 'document': label, 'expires_on': val,
                    })

        return Response({
            'vehicle_status': vehicle_status,
            'active_rentals': active_rentals,
            'booked_rentals': booked_rentals,
            'overdue_rentals': overdue_rentals,
            'upcoming_bookings': upcoming_bookings_qs,
            'available_today_vehicles': available_today_vehicles,
            'total_owners': CarOwner.objects.filter(is_active=True).count(),
            'total_staff': StaffMember.objects.filter(is_active=True).count(),
            'finance_this_month': finance_snapshot,
            'expiring_documents': expiring_docs,
        })
