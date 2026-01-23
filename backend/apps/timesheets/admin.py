"""
Admin Configuration for Timesheets App
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import Timesheet, TimesheetApproval


@admin.register(Timesheet)
class TimesheetAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'employee', 'project', 'task', 'date',
        'hours', 'status_badge', 'submitted_at', 'created_at'
    ]
    list_filter = ['status', 'date', 'project', 'employee']
    search_fields = ['employee__email', 'project__name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'employee', 'project', 'task', 'date', 'hours')
        }),
        ('Details', {
            'fields': ('description', 'status', 'submitted_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def status_badge(self, obj):
        """Display status with color coding"""
        colors = {
            'DRAFT': '#6c757d',
            'SUBMITTED': '#007bff',
            'APPROVED': '#28a745',
            'REJECTED': '#dc3545'
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            colors.get(obj.status, '#6c757d'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'


@admin.register(TimesheetApproval)
class TimesheetApprovalAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'timesheet', 'approved_by', 'status_badge', 'approved_at'
    ]
    list_filter = ['status', 'approved_at', 'approved_by']
    search_fields = ['timesheet__employee__email', 'approved_by__email', 'comments']
    readonly_fields = ['id', 'approved_at']
    
    fieldsets = (
        ('Approval Information', {
            'fields': ('id', 'timesheet', 'approved_by', 'status')
        }),
        ('Details', {
            'fields': ('comments', 'approved_at')
        }),
    )
    
    def status_badge(self, obj):
        """Display status with color coding"""
        colors = {
            'APPROVED': '#28a745',
            'REJECTED': '#dc3545'
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            colors.get(obj.status),
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
