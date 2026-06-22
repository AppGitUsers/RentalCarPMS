from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import AdminTokenObtainPairSerializer, AdminUserSerializer


class AdminLoginView(TokenObtainPairView):
    serializer_class = AdminTokenObtainPairSerializer


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone
        request.user.last_activity = timezone.now()
        request.user.save(update_fields=['last_activity'])
        return Response(AdminUserSerializer(request.user).data)
