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
        data['role'] = self.user.role
        return data


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminUser
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'phone', 'role']


class StaffAccountSerializer(serializers.ModelSerializer):
    staff_member_name = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=True, min_length=4)

    class Meta:
        model = AdminUser
        fields = ['id', 'username', 'password', 'staff_member', 'staff_member_name', 'is_active']

    def get_staff_member_name(self, obj):
        return obj.staff_member.full_name if obj.staff_member_id else 'Common (All Staff)'

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = AdminUser(role='staff', **validated_data)
        user.set_password(password)
        user.save()
        return user
