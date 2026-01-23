"""
Custom permissions for RBAC.
"""
from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Permission class to check if user is an Admin."""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin


class IsOwnerOrAdmin(permissions.BasePermission):
    """Permission class to check if user is the owner or an Admin."""
    
    def has_object_permission(self, request, view, obj):
        # Admin can access everything
        if request.user.is_admin:
            return True
        
        # Check if the object has a user field
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # Check if the object is the user itself
        if hasattr(obj, 'id') and obj.id == request.user.id:
            return True
        
        return False


class CanManageUsers(permissions.BasePermission):
    """Permission to manage users (Admin only)."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.has_permission('manage_users')
        )


class CanManageDepartments(permissions.BasePermission):
    """Permission to manage departments (Admin only)."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.has_permission('manage_departments')
        )


class CanManageProjects(permissions.BasePermission):
    """Permission to manage projects (Admin only)."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.has_permission('manage_projects')
        )


class CanApproveTimesheets(permissions.BasePermission):
    """Permission to approve timesheets (Admin only)."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.has_permission('approve_timesheets')
        )


class CanGenerateReports(permissions.BasePermission):
    """Permission to generate reports (Admin or Project Managers)."""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admins can always generate reports
        if request.user.is_admin:
            return True
        
        # Check if user is a project manager of any project
        from apps.projects.models import Project
        return Project.objects.filter(manager=request.user).exists()


class CanViewAuditLogs(permissions.BasePermission):
    """Permission to view audit logs (Admin or Project Managers)."""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admins can always view audit logs
        if request.user.is_admin:
            return True
        
        # Check if user is a project manager of any project
        from apps.projects.models import Project
        return Project.objects.filter(manager=request.user).exists()
