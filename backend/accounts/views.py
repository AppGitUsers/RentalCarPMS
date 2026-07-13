import logging

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import AdminTokenObtainPairSerializer, AdminUserSerializer

logger = logging.getLogger(__name__)


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
