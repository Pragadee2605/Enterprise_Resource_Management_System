"""
Project Invitation Serializers
"""
from rest_framework import serializers
from .invitation_models import ProjectInvitation


class ProjectInvitationSerializer(serializers.ModelSerializer):
    """Serializer for project invitations"""
    invited_by_name = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True)
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = ProjectInvitation
        fields = [
            'id', 'project', 'project_name', 'email', 'invited_by', 'invited_by_name',
            'token', 'status', 'role', 'message', 'expires_at', 'created_at',
            'accepted_at', 'is_expired'
        ]
        read_only_fields = ['id', 'token', 'invited_by', 'status', 'created_at', 'accepted_at']

    def get_invited_by_name(self, obj):
        return f"{obj.invited_by.first_name} {obj.invited_by.last_name}"

    def get_is_expired(self, obj):
        return obj.is_expired()


class InvitationCreateSerializer(serializers.Serializer):
    """Serializer for creating invitations"""
    project = serializers.CharField()
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=['MEMBER', 'VIEWER'], default='MEMBER')
    message = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        """Validate email format"""
        return value.lower()


class InvitationAcceptSerializer(serializers.Serializer):
    """Serializer for accepting invitations"""
    token = serializers.CharField()
