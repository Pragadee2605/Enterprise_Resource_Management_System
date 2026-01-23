"""
Serializers for Audit App
"""
from rest_framework import serializers
from .models import AuditLog
from apps.users.serializers import UserSerializer


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for Audit Log model"""
    user_details = UserSerializer(source='user', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_details', 'action', 'action_display',
            'model_name', 'object_id', 'object_repr', 'changes',
            'ip_address', 'user_agent', 'timestamp'
        ]
        read_only_fields = fields
