from rest_framework import serializers

from .models import ApplicationSettings


class ApplicationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationSettings
        fields = '__all__'
        read_only_fields = ['id', 'updated_at']
