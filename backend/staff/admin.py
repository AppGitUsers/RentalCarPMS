from django.contrib import admin

from .models import Attendance, SalaryPayment, StaffMember

@admin.register(StaffMember)
class StaffMemberAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'role', 'phone', 'monthly_salary', 'is_active']
    search_fields = ['full_name', 'phone']

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['staff', 'date', 'status', 'shift_in', 'shift_out']
    list_filter = ['status', 'date']

@admin.register(SalaryPayment)
class SalaryPaymentAdmin(admin.ModelAdmin):
    list_display = ['staff', 'month', 'year', 'final_amount', 'is_paid']
    list_filter = ['is_paid', 'year', 'month']
