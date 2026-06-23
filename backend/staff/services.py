import calendar
from decimal import ROUND_HALF_UP, Decimal


def q2(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def compute_or_refresh_salary(staff, month: int, year: int):
    """
    Aggregates attendance for the given month/year and computes salary owed,
    pro-rated by hours worked vs expected hours (derived from the staff member's
    default shift, or the global standard_shift_hours setting as fallback).
    Creates or updates the SalaryPayment row idempotently (won't touch paid rows).
    """
    from settings_app.models import ApplicationSettings

    from .models import Attendance, SalaryPayment

    settings_obj = ApplicationSettings.load()

    # Expected hours: shift hours × working days this month.
    # Working days counted via shift's day-of-week flags; falls back to all calendar days.
    if staff.default_shift:
        daily_hours = Decimal(str(staff.default_shift.shift_hours()))
        working_days = staff.default_shift.working_days_in_month(year, month)
    else:
        daily_hours = Decimal(settings_obj.standard_shift_hours)
        working_days = calendar.monthrange(year, month)[1]

    expected_hours = daily_hours * Decimal(working_days)

    records = Attendance.objects.filter(staff=staff, date__year=year, date__month=month)

    total_hours = Decimal('0.00')
    ot_total = Decimal('0.00')
    days_present = Decimal('0.00')
    late_count = 0

    for rec in records:
        if rec.is_late:
            late_count += 1
        if rec.status == 'present':
            days_present += Decimal('1.00')
            hours = rec.hours_worked()
            total_hours += Decimal(str(hours)) if hours is not None else daily_hours
            ot_total += Decimal(str(rec.overtime_hours or 0))
        elif rec.status == 'half_day':
            days_present += Decimal('0.50')
            hours = rec.hours_worked()
            total_hours += Decimal(str(hours)) if hours is not None else (daily_hours / 2)
        # absent / leave contribute 0

    ratio = (total_hours / expected_hours) if expected_hours > 0 else Decimal('0.00')
    ratio = min(ratio, Decimal('1.00'))

    computed_amount = q2(Decimal(staff.monthly_salary) * ratio)

    salary_payment, _created = SalaryPayment.objects.get_or_create(
        staff=staff, month=month, year=year,
        defaults={'expected_hours': expected_hours},
    )
    if salary_payment.is_paid:
        return salary_payment

    salary_payment.days_present = days_present
    salary_payment.total_hours_worked = total_hours
    salary_payment.expected_hours = expected_hours
    salary_payment.late_count = late_count
    salary_payment.overtime_hours_total = ot_total
    salary_payment.computed_amount = computed_amount
    salary_payment.final_amount = q2(computed_amount + Decimal(salary_payment.adjustment or 0))
    salary_payment.save()
    return salary_payment
