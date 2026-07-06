from django.contrib import admin

from .models import StaffAttendance, StaffMember, StaffPayment


@admin.register(StaffMember)
class StaffMemberAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'role', 'phone', 'monthly_salary', 'date_joined', 'is_active']
    list_filter = ['role', 'is_active']
    search_fields = ['full_name', 'phone']


@admin.register(StaffAttendance)
class StaffAttendanceAdmin(admin.ModelAdmin):
    list_display = ['staff', 'date', 'status']
    list_filter = ['status', 'date']
    search_fields = ['staff__full_name']


@admin.register(StaffPayment)
class StaffPaymentAdmin(admin.ModelAdmin):
    list_display = ['staff', 'month', 'year', 'amount', 'paid_at']
    list_filter = ['year', 'month']
    search_fields = ['staff__full_name']
