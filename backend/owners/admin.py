from django.contrib import admin

from .models import CarOwner

@admin.register(CarOwner)
class CarOwnerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'upi_id', 'is_active']
    search_fields = ['name', 'phone', 'upi_id']
