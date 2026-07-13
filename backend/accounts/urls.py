from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import AdminLoginView, CurrentUserView, StaffAccountDetailView, StaffAccountView

urlpatterns = [
    path('login/', AdminLoginView.as_view(), name='admin-login'),
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('staff-accounts/', StaffAccountView.as_view(), name='staff-accounts'),
    path('staff-accounts/<int:pk>/', StaffAccountDetailView.as_view(), name='staff-account-detail'),
]
