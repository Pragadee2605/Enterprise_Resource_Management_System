"""
Django admin configuration for Users app.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, LoginAttempt


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin for User model."""
    
    list_display = [
        'email', 'full_name_display', 'role_badge', 'department',
        'is_active_badge', 'date_joined'
    ]
    list_filter = ['role', 'is_active', 'is_staff', 'department', 'date_joined']
    search_fields = ['email', 'first_name', 'last_name', 'employee_id']
    ordering = ['-date_joined']
    
    fieldsets = (
        ('Personal Info', {
            'fields': ('email', 'first_name', 'last_name', 'phone_number', 'employee_id')
        }),
        ('Organization', {
            'fields': ('role', 'department')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser')
        }),
        ('Security', {
            'fields': ('password', 'password_changed_at', 'must_change_password')
        }),
        ('Important dates', {
            'fields': ('last_login', 'date_joined')
        }),
    )
    
    add_fieldsets = (
        ('User Information', {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2'),
        }),
        ('Role & Department', {
            'classes': ('wide',),
            'fields': ('role', 'department'),
        }),
    )
    
    readonly_fields = ['date_joined', 'last_login', 'password_changed_at']
    
    def full_name_display(self, obj):
        """Display full name."""
        return obj.get_full_name()
    full_name_display.short_description = 'Name'
    
    def role_badge(self, obj):
        """Display role with color badge."""
        colors = {
            'ADMIN': '#dc3545',
            'MANAGER': '#007bff',
            'EMPLOYEE': '#28a745',
        }
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-size: 11px;">{}</span>',
            colors.get(obj.role, '#6c757d'),
            obj.get_role_display()
        )
    role_badge.short_description = 'Role'
    
    def is_active_badge(self, obj):
        """Display active status with badge."""
        if obj.is_active:
            return format_html(
                '<span style="color: green;">✓ Active</span>'
            )
        return format_html(
            '<span style="color: red;">✗ Inactive</span>'
        )
    is_active_badge.short_description = 'Status'


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    """Admin for LoginAttempt model."""
    
    list_display = ['email', 'ip_address', 'success_badge', 'timestamp']
    list_filter = ['success', 'timestamp']
    search_fields = ['email', 'ip_address']
    ordering = ['-timestamp']
    readonly_fields = ['email', 'ip_address', 'success', 'timestamp', 'user_agent']
    
    def has_add_permission(self, request):
        """Disable adding login attempts through admin."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Disable changing login attempts."""
        return False
    
    def success_badge(self, obj):
        """Display success status with icon."""
        if obj.success:
            return format_html(
                '<span style="color: green; font-size: 16px;">✓</span>'
            )
        return format_html(
            '<span style="color: red; font-size: 16px;">✗</span>'
        )
    success_badge.short_description = 'Success'
