from django.contrib import admin

from .models import OwnerPayout, Rental, RentalPayment

class RentalPaymentInline(admin.TabularInline):
    model = RentalPayment
    extra = 0

@admin.register(Rental)
class RentalAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'vehicle', 'status', 'payment_status', 'total_amount', 'created_at']
    list_filter = ['status', 'payment_status', 'payment_timing']
    search_fields = ['customer__full_name', 'vehicle__registration_number']
    inlines = [RentalPaymentInline]

@admin.register(OwnerPayout)
class OwnerPayoutAdmin(admin.ModelAdmin):
    list_display = ['id', 'owner', 'payout_type', 'amount', 'paid_at']
    list_filter = ['payout_type']
