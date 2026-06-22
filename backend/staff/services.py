import calendar
from decimal import ROUND_HALF_UP, Decimal


def q2(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def compute_or_refresh_salary(staff, month: int, year: int):
    """
    Aggregates this staff member's Attendance for the given month/year and
    computes salary owed, pro-rated by hours worked vs expected standard
    hours for the days in that month. Creates or updates the SalaryPayment
    row (idempotent - safe to call repeatedly as attendance changes, as long
    as it hasn't been marked paid yet).
    """
    from settings_app.models import ApplicationSettings

    from .models import Attendance, SalaryPayment

    settings_obj = ApplicationSettings.load()
    standard_hours = Decimal(settings_obj.standard_shift_hours)

    days_in_month = calendar.monthrange(year, month)[1]
    expected_hours = standard_hours * Decimal(days_in_month)

    records = Attendance.objects.filter(staff=staff, date__year=year, date__month=month)

    total_hours = Decimal('0.00')
    days_present = Decimal('0.00')
    for rec in records:
        if rec.status == 'present':
            days_present += Decimal('1.00')
            hours = rec.hours_worked()
            total_hours += Decimal(str(hours)) if hours else standard_hours
        elif rec.status == 'half_day':
            days_present += Decimal('0.50')
            hours = rec.hours_worked()
            total_hours += Decimal(str(hours)) if hours else (standard_hours / 2)
        # absent / leave contribute 0

    if expected_hours > 0:
        ratio = total_hours / expected_hours
    else:
        ratio = Decimal('0.00')
    ratio = min(ratio, Decimal('1.00'))  # never pay more than 100% of monthly salary via this calc

    computed_amount = q2(Decimal(staff.monthly_salary) * ratio)

    salary_payment, _created = SalaryPayment.objects.get_or_create(
        staff=staff, month=month, year=year,
        defaults={'expected_hours': expected_hours},
    )
    if salary_payment.is_paid:
        # Don't silently change a record that's already been paid out.
        return salary_payment

    salary_payment.days_present = days_present
    salary_payment.total_hours_worked = total_hours
    salary_payment.expected_hours = expected_hours
    salary_payment.computed_amount = computed_amount
    salary_payment.final_amount = q2(computed_amount + Decimal(salary_payment.adjustment or 0))
    salary_payment.save()
    return salary_payment
