"""
Project Admin Configuration
"""
from django.contrib import admin
from django.utils.html import format_html
from apps.projects.models import Project, ProjectMember


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    """Admin configuration for Project"""
    list_display = ['code', 'name', 'department', 'manager', 'status_badge', 'start_date', 'end_date', 'is_active']
    list_filter = ['status', 'is_active', 'department', 'start_date']
    search_fields = ['name', 'code', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'start_date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'code', 'description', 'department')
        }),
        ('Management', {
            'fields': ('manager', 'budget', 'status')
        }),
        ('Timeline', {
            'fields': ('start_date', 'end_date')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('System', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def status_badge(self, obj):
        colors = {
            'PLANNING': '#6c757d',
            'ACTIVE': '#28a745',
            'ON_HOLD': '#ffc107',
            'COMPLETED': '#007bff',
            'CANCELLED': '#dc3545'
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            colors.get(obj.status, '#6c757d'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    """Admin configuration for ProjectMember"""
    list_display = ['user', 'project', 'role', 'joined_date', 'is_active']
    list_filter = ['role', 'is_active', 'joined_date']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'project__name']
    readonly_fields = ['id', 'joined_date']
    
    fieldsets = (
        ('Assignment', {
            'fields': ('project', 'user', 'role')
        }),
        ('Status', {
            'fields': ('is_active', 'joined_date')
        }),
        ('System', {
            'fields': ('id',),
            'classes': ('collapse',)
        }),
    )
