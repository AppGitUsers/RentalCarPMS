from rest_framework.routers import DefaultRouter

from .views import AttendanceViewSet, SalaryPaymentViewSet, ShiftViewSet, StaffMemberViewSet

router = DefaultRouter()
router.register('shifts', ShiftViewSet, basename='shift')
router.register('members', StaffMemberViewSet, basename='staff-member')
router.register('attendance', AttendanceViewSet, basename='attendance')
router.register('salary', SalaryPaymentViewSet, basename='salary-payment')

urlpatterns = router.urls
