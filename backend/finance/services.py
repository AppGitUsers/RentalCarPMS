from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone


def get_finance_summary(month: int, year: int):
    """
    Aggregates everything for the Finance dashboard for a given month:
    - Rental income: collected (amount_paid) and to-be-collected (balance_due)
      across rentals created/active in that month, total without GST breakdown
      as the headline figure (GST shown separately).
    - Owner payouts (expense)
    - Staff salary payments (expense)
    - Custom FinanceEntry income/expense
    Also returns yearly income total.
    """
    from finance.models import FinanceEntry
    from rentals.models import OwnerPayout, Rental
    from staff.models import SalaryPayment

    rentals_qs = Rental.objects.filter(
        created_at__year=year, created_at__month=month,
    ).exclude(status='cancelled')

    total_collected = rentals_qs.aggregate(total=Sum('amount_paid'))['total'] or Decimal('0.00')
    total_billed = rentals_qs.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
    total_gst = rentals_qs.aggregate(total=Sum('gst_amount'))['total'] or Decimal('0.00')
    to_be_collected = total_billed - total_collected

    owner_payouts_qs = OwnerPayout.objects.filter(paid_at__year=year, paid_at__month=month)
    total_owner_payouts = owner_payouts_qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    salary_qs = SalaryPayment.objects.filter(paid_at__year=year, paid_at__month=month, is_paid=True)
    total_salary_paid = salary_qs.aggregate(total=Sum('final_amount'))['total'] or Decimal('0.00')

    custom_income_qs = FinanceEntry.objects.filter(entry_type='income', date__year=year, date__month=month)
    custom_expense_qs = FinanceEntry.objects.filter(entry_type='expense', date__year=year, date__month=month)
    custom_income_total = custom_income_qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    custom_expense_total = custom_expense_qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    total_income = total_collected + custom_income_total
    total_expense = total_owner_payouts + total_salary_paid + custom_expense_total
    savings = total_income - total_expense

    # Yearly income (collected rental income + custom income, whole year)
    yearly_rentals_qs = Rental.objects.filter(created_at__year=year).exclude(status='cancelled')
    yearly_collected = yearly_rentals_qs.aggregate(total=Sum('amount_paid'))['total'] or Decimal('0.00')
    yearly_custom_income = FinanceEntry.objects.filter(
        entry_type='income', date__year=year,
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    yearly_income = yearly_collected + yearly_custom_income

    return {
        'month': month,
        'year': year,
        'income': {
            'rental_collected': total_collected,
            'rental_to_be_collected': to_be_collected,
            'rental_total_billed': total_billed,
            'gst_collected': total_gst,
            'custom_income': custom_income_total,
            'total_income': total_income,
        },
        'expense': {
            'owner_payouts': total_owner_payouts,
            'staff_salary': total_salary_paid,
            'custom_expense': custom_expense_total,
            'total_expense': total_expense,
        },
        'savings': savings,
        'yearly_income': yearly_income,
    }


def get_monthly_trend(year: int):
    """12-month income/expense trend for charts."""
    from finance.models import FinanceEntry
    from rentals.models import OwnerPayout, Rental
    from staff.models import SalaryPayment

    trend = []
    for month in range(1, 13):
        rentals_qs = Rental.objects.filter(
            created_at__year=year, created_at__month=month,
        ).exclude(status='cancelled')
        collected = rentals_qs.aggregate(total=Sum('amount_paid'))['total'] or Decimal('0.00')

        custom_income = FinanceEntry.objects.filter(
            entry_type='income', date__year=year, date__month=month,
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        owner_payouts = OwnerPayout.objects.filter(
            paid_at__year=year, paid_at__month=month,
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        salary = SalaryPayment.objects.filter(
            paid_at__year=year, paid_at__month=month, is_paid=True,
        ).aggregate(total=Sum('final_amount'))['total'] or Decimal('0.00')
        custom_expense = FinanceEntry.objects.filter(
            entry_type='expense', date__year=year, date__month=month,
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        income = collected + custom_income
        expense = owner_payouts + salary + custom_expense
        trend.append({
            'month': month,
            'income': income,
            'expense': expense,
            'savings': income - expense,
        })
    return trend
