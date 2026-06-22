from rest_framework import serializers

from .models import FinanceEntry


class FinanceEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = FinanceEntry
        fields = [
            'id', 'entry_type', 'category', 'title', 'amount', 'date',
            'notes', 'attachment', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
