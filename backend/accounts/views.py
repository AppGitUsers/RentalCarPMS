import logging

from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import AdminUser
from .serializers import AdminTokenObtainPairSerializer, AdminUserSerializer, StaffAccountSerializer

logger = logging.getLogger(__name__)


def _require_admin(user):
    if user.role != 'admin':
        raise PermissionDenied("Admin access required.")


class AdminLoginView(TokenObtainPairView):
    serializer_class = AdminTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        username = request.data.get('username', '?')
        try:
            response = super().post(request, *args, **kwargs)
            logger.info("Login successful: %s", username)
            return response
        except Exception:
            logger.warning("Login failed for username: %s", username)
            raise


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone
        request.user.last_activity = timezone.now()
        request.user.save(update_fields=['last_activity'])
        logger.info("Activity ping: %s", request.user.username)
        return Response(AdminUserSerializer(request.user).data)


class StaffAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _require_admin(request.user)
        accounts = AdminUser.objects.filter(role='staff').select_related('staff_member').order_by('username')
        return Response(StaffAccountSerializer(accounts, many=True).data)

    def post(self, request):
        _require_admin(request.user)
        serializer = StaffAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = serializer.save()
        logger.info("Staff account created: %s by admin %s", account.username, request.user.username)
        return Response(StaffAccountSerializer(account).data, status=201)


class StaffAccountDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_account(self, pk):
        try:
            return AdminUser.objects.get(pk=pk, role='staff')
        except AdminUser.DoesNotExist:
            raise NotFound()

    def delete(self, request, pk):
        _require_admin(request.user)
        account = self._get_account(pk)
        username = account.username
        account.delete()
        logger.info("Staff account deleted: %s by admin %s", username, request.user.username)
        return Response(status=204)

    def patch(self, request, pk):
        _require_admin(request.user)
        account = self._get_account(pk)
        password = request.data.get('password', '')
        if not password or len(str(password)) < 4:
            raise ValidationError({'password': 'Password must be at least 4 characters.'})
        account.set_password(password)
        account.save(update_fields=['password'])
        logger.info("Staff account password changed: %s by admin %s", account.username, request.user.username)
        return Response({'detail': 'Password updated.'})
