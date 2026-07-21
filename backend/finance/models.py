from django.db import models


class FinanceEntry(models.Model):
    """
    Custom/manual income or expense entry - e.g. fuel purchase, office rent,
    a one-off cash sale, vehicle maintenance bill etc. Rental income, owner
    payouts and staff salary payments are tracked in their own models and
    are aggregated alongside these entries in the Finance dashboard/report,
    rather than duplicated here.
    """
    ENTRY_TYPE_CHOICES = [
        ("income", "Income"),
        ("expense", "Expense"),
    ]
    CATEGORY_CHOICES = [
        ("fuel", "Fuel"),
        ("maintenance", "Vehicle Maintenance"),
        ("office", "Office / Rent"),
        ("marketing", "Marketing"),
        ("insurance", "Insurance"),
        ("rental_cancellation", "Rental Cancellation"),
        ("misc_income", "Other Income"),
        ("misc_expense", "Other Expense"),
    ]

    entry_type = models.CharField(max_length=10, choices=ENTRY_TYPE_CHOICES)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="misc_expense")
    title = models.CharField(max_length=150)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField(db_index=True)
    notes = models.TextField(blank=True, default="")
    attachment = models.FileField(upload_to="finance/attachments/", blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        verbose_name_plural = "Finance Entries"

    def __str__(self):
        return f"{self.get_entry_type_display()}: {self.title} - {self.amount}"
