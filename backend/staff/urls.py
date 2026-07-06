from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import StaffAttendanceViewSet, StaffMemberViewSet

router = DefaultRouter()
router.register('members', StaffMemberViewSet, basename='staff-member')

urlpatterns = router.urls + [
    path(
        'attendance/by_staff_month/',
        StaffAttendanceViewSet.as_view({'get': 'by_staff_month'}),
        name='attendance-by-month',
    ),
    path(
        'attendance/toggle/',
        StaffAttendanceViewSet.as_view({'post': 'toggle'}),
        name='attendance-toggle',
    ),
]
