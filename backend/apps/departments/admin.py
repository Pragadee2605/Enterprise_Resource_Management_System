"""
Django admin configuration for Departments app.
"""
from django.contrib import admin
from .models import Department


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    """Admin for Department model."""
    
    list_display = ['name', 'code', 'manager', 'employee_count', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'code', 'description']
    ordering = ['name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'code', 'description')
        }),
        ('Management', {
            'fields': ('manager',)
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )
    
    readonly_fields = []
    
    def employee_count(self, obj):
        """Display number of employees."""
        return obj.employee_count
    employee_count.short_description = 'Employees'
