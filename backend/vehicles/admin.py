from django.contrib import admin

from .models import Vehicle, VehicleImage

class VehicleImageInline(admin.TabularInline):
    model = VehicleImage
    extra = 1

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ['registration_number', 'make', 'model', 'owner', 'status']
    list_filter = ['status', 'fuel_type', 'transmission']
    search_fields = ['registration_number', 'make', 'model']
    inlines = [VehicleImageInline]
