from rest_framework import serializers

from .models import FinanceEntry


class FinanceEntrySerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FinanceEntry
        fields = [
            'id', 'entry_type', 'category', 'title', 'amount', 'date',
            'notes', 'attachment', 'created_by', 'created_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if not obj.created_by_id:
            return None
        user = obj.created_by
        return f"{user.first_name} {user.last_name}".strip() or user.username
