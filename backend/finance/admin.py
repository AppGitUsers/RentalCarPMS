from django.contrib import admin

from .models import FinanceEntry

@admin.register(FinanceEntry)
class FinanceEntryAdmin(admin.ModelAdmin):
    list_display = ['title', 'entry_type', 'category', 'amount', 'date']
    list_filter = ['entry_type', 'category']
    search_fields = ['title', 'notes']
