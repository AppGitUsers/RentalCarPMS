from decimal import Decimal

from django.db.models import Sum


def compute_owner_outstanding_balance(owner):
    """
    Owner's share of revenue from CLOSED rentals (since totals are only
    final at closing) minus whatever has already been paid out to them.
    Used for the 'collective payout' flow and the owners dashboard.

    Each rental's share is rounded individually before summing, matching
    exactly how compute_owner_share_for_rental() rounds when a payout is
    actually made - otherwise summing unrounded shares and then rounding
    once at the end can drift by a cent or two from what was actually paid.
    """
    from rentals.models import Rental

    closed_rentals = Rental.objects.filter(
        vehicle__owner=owner, status='closed',
    )
    total_owed = Decimal('0.00')
    for rental in closed_rentals:
        total_owed += compute_owner_share_for_rental(rental)

    paid_out = owner.payouts.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    result = round(total_owed - paid_out, 2)
    return abs(result) if result == 0 else result


def compute_owner_share_for_rental(rental):
    """The amount owed to the owner for a single closed rental — uses VehicleOwnerRate snapshots (per-day amount + late/km/damage shares)."""
    return rental.computed_owner_payout


def unpaid_rentals_for_owner(owner):
    """Closed rentals for this owner that have not yet been fully covered by a payout."""
    from rentals.models import Rental

    paid_rental_ids = set()
    for payout in owner.payouts.all():
        for r in payout.rentals.all():
            paid_rental_ids.add(r.id)

    return Rental.objects.filter(
        vehicle__owner=owner, status='closed',
    ).exclude(id__in=paid_rental_ids).order_by('-closed_at')
