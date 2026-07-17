import calendar as _cal
import logging
from datetime import date as _date
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Sum

logger = logging.getLogger(__name__)


CL_PER_MONTH = 2


def q2(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def salary_summary(staff, year: int, month: int):
    """
    Returns salary details for a staff member in the given month, or None
    if the staff member had not yet joined in that month.
    """
    from .models import StaffAttendance, StaffPayment

    total_days = _cal.monthrange(year, month)[1]
    month_start = _date(year, month, 1)
    month_end = _date(year, month, total_days)

    if staff.date_joined > month_end:
        return None

    work_start = max(staff.date_joined, month_start)
    working_days = (month_end - work_start).days + 1

    qs = StaffAttendance.objects.filter(
        staff=staff,
        date__year=year,
        date__month=month,
        date__gte=work_start,
    )
    absent_days = qs.filter(status='absent').count()
    cl_days = qs.filter(status='cl').count()
    auth_leave_days = qs.filter(status='auth_leave').count()
    cl_available = max(0, CL_PER_MONTH - cl_days)
    deduction_days = absent_days
    present_days = working_days - absent_days - cl_days - auth_leave_days

    per_day = Decimal(str(staff.monthly_salary)) / Decimal(str(total_days))
    calculated_amount = q2(
        per_day * Decimal(str(working_days)) - per_day * Decimal(str(deduction_days))
    )

    paid_this_month = (
        StaffPayment.objects.filter(staff=staff, year=year, month=month)
        .aggregate(total=Sum('amount'))['total']
        or Decimal('0.00')
    )
    paid_this_month = q2(Decimal(str(paid_this_month)))

    # Delivery earnings: rentals where this staff is assigned driver, in this month
    from rentals.models import Rental
    delivery_qs = list(
        Rental.objects.filter(
            assigned_staff=staff,
            scheduled_start__year=year,
            scheduled_start__month=month,
            driver_delivery_charge__gt=0,
        ).exclude(status='cancelled').select_related('customer').order_by('scheduled_start')
    )
    delivery_earnings = q2(sum(
        (Decimal(str(r.driver_delivery_charge)) for r in delivery_qs), Decimal('0')
    ))
    delivery_breakdown = [
        {
            'rental_id': r.id,
            'customer': r.customer.full_name,
            'date': str(r.scheduled_start.date()),
            'location': r.pickup_venue_other_location or r.get_pickup_venue_display(),
            'amount': str(q2(Decimal(str(r.driver_delivery_charge)))),
        }
        for r in delivery_qs
    ]

    total_payable = q2(calculated_amount + delivery_earnings)

    result = {
        'total_days': total_days,
        'working_days': working_days,
        'present_days': present_days,
        'absent_days': absent_days,
        'cl_days': cl_days,
        'auth_leave_days': auth_leave_days,
        'cl_available': cl_available,
        'deduction_days': deduction_days,
        'per_day': q2(per_day),
        'calculated_amount': calculated_amount,
        'delivery_earnings': delivery_earnings,
        'delivery_breakdown': delivery_breakdown,
        'total_payable': total_payable,
        'paid_this_month': paid_this_month,
        'balance': q2(total_payable - paid_this_month),
    }
    logger.info(
        "Salary summary — %s %s/%s: present=%s absent=%s CL=%s salary=%s delivery=%s payable=%s paid=%s balance=%s",
        staff.full_name, month, year,
        present_days, absent_days, cl_days,
        calculated_amount, delivery_earnings, total_payable, paid_this_month, result['balance'],
    )
    return result


def next_attendance_status(current_status, cl_available: int):
    """
    Cycle: present → cl (if CL available) or absent → absent → present (delete).
    Returns new status string, or None to remove the record (back to present).
    """
    if current_status is None:
        return 'cl' if cl_available > 0 else 'absent'
    if current_status == 'cl':
        return 'absent'
    return None
