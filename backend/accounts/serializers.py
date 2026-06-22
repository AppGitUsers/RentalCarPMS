from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import AdminUser


class AdminTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        self.user.last_activity = timezone.now()
        self.user.save(update_fields=['last_activity'])
        data['username'] = self.user.username
        data['full_name'] = f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username
        return data


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminUser
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'phone']
