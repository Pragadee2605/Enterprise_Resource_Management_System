"""
Admin Configuration for Audit App
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user', 'action_badge', 'model_name',
        'object_repr', 'ip_address', 'timestamp'
    ]
    list_filter = ['action', 'model_name', 'timestamp', 'user']
    search_fields = ['user__email', 'object_repr', 'ip_address', 'model_name']
    readonly_fields = [
        'id', 'user', 'action', 'model_name', 'object_id',
        'object_repr', 'changes', 'ip_address', 'user_agent', 'timestamp'
    ]
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'user', 'action', 'timestamp')
        }),
        ('Object Information', {
            'fields': ('model_name', 'object_id', 'object_repr', 'changes')
        }),
        ('Request Information', {
            'fields': ('ip_address', 'user_agent')
        }),
    )
    
    def action_badge(self, obj):
        """Display action with color coding"""
        colors = {
            'CREATE': '#28a745',
            'UPDATE': '#007bff',
            'DELETE': '#dc3545',
            'LOGIN': '#17a2b8',
            'LOGOUT': '#6c757d',
            'APPROVE': '#28a745',
            'REJECT': '#dc3545'
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            colors.get(obj.action, '#6c757d'),
            obj.get_action_display()
        )
    action_badge.short_description = 'Action'
    
    def has_add_permission(self, request):
        """Prevent manual creation of audit logs"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of audit logs"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Prevent modification of audit logs"""
        return False
