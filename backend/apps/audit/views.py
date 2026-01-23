"""
Views for Audit App
"""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from .models import AuditLog
from .serializers import AuditLogSerializer
from apps.users.permissions import CanViewAuditLogs


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing audit logs (read-only)
    
    Endpoints:
    - GET /api/v1/audit/ - List audit logs
    - GET /api/v1/audit/{id}/ - Get audit log details
    
    Admins see all logs, project managers see only logs for their managed projects
    """
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, CanViewAuditLogs]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'model_name', 'user']
    search_fields = ['object_repr', 'ip_address', 'user__email']
    ordering_fields = ['timestamp', 'action']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """Filter audit logs based on user role"""
        user = self.request.user
        
        if user.is_admin:
            # Admins see all logs
            return AuditLog.objects.all().select_related('user')
        else:
            # Project managers see logs for their managed projects and related entities
            from apps.projects.models import Project
            from django.db.models import Q
            
            managed_projects = Project.objects.filter(manager=user)
            project_ids = list(managed_projects.values_list('id', flat=True))
            
            # Filter logs related to managed projects and their tasks/timesheets
            return AuditLog.objects.filter(
                Q(model_name='Project', object_id__in=[str(pid) for pid in project_ids]) |
                Q(model_name='Task', changes__contains='project') |
                Q(model_name='Timesheet', changes__contains='project')
            ).select_related('user')
