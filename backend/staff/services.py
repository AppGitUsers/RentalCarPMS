import calendar as _cal
from datetime import date as _date
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Sum


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
    cl_available = max(0, CL_PER_MONTH - cl_days)
    deduction_days = absent_days
    present_days = working_days - absent_days - cl_days

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

    return {
        'total_days': total_days,
        'working_days': working_days,
        'present_days': present_days,
        'absent_days': absent_days,
        'cl_days': cl_days,
        'cl_available': cl_available,
        'deduction_days': deduction_days,
        'per_day': q2(per_day),
        'calculated_amount': calculated_amount,
        'paid_this_month': paid_this_month,
        'balance': q2(calculated_amount - paid_this_month),
    }


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
