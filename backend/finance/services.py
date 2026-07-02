from decimal import Decimal

from django.db.models import Sum


def get_finance_summary(month: int, year: int):
    from finance.models import FinanceEntry
    from rentals.models import OwnerPayout, Rental
    from staff.models import SalaryPayment

    # 1 query — all three rental aggregates in one shot
    rental_aggs = Rental.objects.filter(
        created_at__year=year, created_at__month=month,
    ).exclude(status='cancelled').aggregate(
        total_collected=Sum('amount_paid'),
        total_billed=Sum('total_amount'),
        total_gst=Sum('gst_amount'),
    )
    total_collected = rental_aggs['total_collected'] or Decimal('0.00')
    total_billed    = rental_aggs['total_billed']    or Decimal('0.00')
    total_gst       = rental_aggs['total_gst']       or Decimal('0.00')
    to_be_collected = total_billed - total_collected

    # 1 query — both custom entry types in one shot using conditional Sum
    from django.db.models import Case, When, DecimalField
    entry_aggs = FinanceEntry.objects.filter(
        date__year=year, date__month=month,
    ).aggregate(
        custom_income=Sum(
            Case(When(entry_type='income', then='amount'), default=0, output_field=DecimalField())
        ),
        custom_expense=Sum(
            Case(When(entry_type='expense', then='amount'), default=0, output_field=DecimalField())
        ),
    )
    custom_income_total  = entry_aggs['custom_income']  or Decimal('0.00')
    custom_expense_total = entry_aggs['custom_expense'] or Decimal('0.00')

    # 1 query each — simple aggregates
    total_owner_payouts = OwnerPayout.objects.filter(
        paid_at__year=year, paid_at__month=month,
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    total_salary_paid = SalaryPayment.objects.filter(
        paid_at__year=year, paid_at__month=month, is_paid=True,
    ).aggregate(total=Sum('final_amount'))['total'] or Decimal('0.00')

    # 1 query — yearly rental + custom income combined
    yearly_aggs = FinanceEntry.objects.filter(
        entry_type='income', date__year=year,
    ).aggregate(total=Sum('amount'))
    yearly_custom_income = yearly_aggs['total'] or Decimal('0.00')

    yearly_collected = Rental.objects.filter(
        created_at__year=year,
    ).exclude(status='cancelled').aggregate(total=Sum('amount_paid'))['total'] or Decimal('0.00')

    total_income  = total_collected + custom_income_total
    total_expense = total_owner_payouts + total_salary_paid + custom_expense_total

    return {
        'month': month,
        'year': year,
        'income': {
            'rental_collected':        total_collected,
            'rental_to_be_collected':  to_be_collected,
            'rental_total_billed':     total_billed,
            'gst_collected':           total_gst,
            'custom_income':           custom_income_total,
            'total_income':            total_income,
        },
        'expense': {
            'owner_payouts':   total_owner_payouts,
            'staff_salary':    total_salary_paid,
            'custom_expense':  custom_expense_total,
            'total_expense':   total_expense,
        },
        'savings':       total_income - total_expense,
        'yearly_income': yearly_collected + yearly_custom_income,
    }


def get_monthly_trend(year: int):
    """12-month income/expense trend — 5 queries total instead of 48."""
    from django.db.models.functions import ExtractMonth
    from finance.models import FinanceEntry
    from rentals.models import OwnerPayout, Rental
    from staff.models import SalaryPayment

    zero = Decimal('0.00')

    def month_dict(qs, value_key):
        return {row['m']: row[value_key] or zero for row in qs}

    # 1 query: rental collected per month
    rental_by_month = month_dict(
        Rental.objects.filter(created_at__year=year)
        .exclude(status='cancelled')
        .annotate(m=ExtractMonth('created_at'))
        .values('m')
        .annotate(total=Sum('amount_paid')),
        'total',
    )

    # 1 query: custom income + expense per month (both in one pass)
    from django.db.models import Case, When, DecimalField
    entry_by_month = {}
    for row in (
        FinanceEntry.objects.filter(date__year=year)
        .annotate(m=ExtractMonth('date'))
        .values('m')
        .annotate(
            income=Sum(Case(When(entry_type='income', then='amount'), default=0, output_field=DecimalField())),
            expense=Sum(Case(When(entry_type='expense', then='amount'), default=0, output_field=DecimalField())),
        )
    ):
        entry_by_month[row['m']] = (row['income'] or zero, row['expense'] or zero)

    # 1 query: owner payouts per month
    owner_by_month = month_dict(
        OwnerPayout.objects.filter(paid_at__year=year)
        .annotate(m=ExtractMonth('paid_at'))
        .values('m')
        .annotate(total=Sum('amount')),
        'total',
    )

    # 1 query: salary paid per month (by paid_at)
    salary_by_month = month_dict(
        SalaryPayment.objects.filter(paid_at__year=year, is_paid=True)
        .annotate(m=ExtractMonth('paid_at'))
        .values('m')
        .annotate(total=Sum('final_amount')),
        'total',
    )

    trend = []
    for month in range(1, 13):
        custom_income, custom_expense = entry_by_month.get(month, (zero, zero))
        income  = rental_by_month.get(month, zero) + custom_income
        expense = owner_by_month.get(month, zero) + salary_by_month.get(month, zero) + custom_expense
        trend.append({
            'month':   month,
            'income':  income,
            'expense': expense,
            'savings': income - expense,
        })
    return trend
