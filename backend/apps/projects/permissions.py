"""
Jira-like Permission System
Combines system roles (ADMIN/MANAGER/EMPLOYEE) with project roles (LEAD/DEVELOPER/VIEWER)
"""
from rest_framework import permissions
from apps.projects.models import ProjectMember


class ProjectPermission(permissions.BasePermission):
    """
    Jira-like project permissions:
    - System ADMIN: Can do anything in any project
    - System MANAGER: Can create projects, manage projects they lead
    - System EMPLOYEE: Can only access projects they're members of
    
    Project roles within a project:
    - LEAD: Full control of the project
    - DEVELOPER: Can create/edit tasks, update status
    - VIEWER: Read-only access
    """
    
    def has_permission(self, request, view):
        """Check if user can access the project list/create"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Everyone can list projects (filtered by membership in view)
        if view.action == 'list':
            return True
        
        # JIRA: Any authenticated user can create projects
        if view.action == 'create':
            return True
        
        return True
    
    def has_object_permission(self, request, view, obj):
        """Check if user can access/modify a specific project"""
        user = request.user
        
        # System ADMIN has full access
        if user.role == 'ADMIN':
            return True
        
        # Check if user is a member of this project
        try:
            membership = ProjectMember.objects.get(project=obj, user=user, is_active=True)
        except ProjectMember.DoesNotExist:
            return False
        
        # Read operations: All project members can view
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write operations depend on project role
        if view.action in ['update', 'partial_update', 'destroy']:
            # Only LEAD can modify project (or ADMIN for system management)
            return membership.role == 'LEAD'
        
        # Add/remove members and invite: LEAD only
        if view.action in ['add_member', 'remove_member', 'members', 'invite_members', 'list_invitations', 
                           'resend_invitation', 'delete_invitation', 'update_invitation']:
            return membership.role == 'LEAD' or user.role == 'ADMIN'
        
        return False


class TaskPermission(permissions.BasePermission):
    """
    Jira-like task/issue permissions
    """
    
    def has_permission(self, request, view):
        """Check if user can access tasks"""
        if not request.user or not request.user.is_authenticated:
            return False
        return True
    
    def has_object_permission(self, request, view, obj):
        """Check if user can access/modify a specific task"""
        user = request.user
        project = obj.project
        
        # System ADMIN has full access
        if user.role == 'ADMIN':
            return True
        
        # Check project membership
        try:
            membership = ProjectMember.objects.get(project=project, user=user, is_active=True)
        except ProjectMember.DoesNotExist:
            return False
        
        # VIEWER can only read
        if membership.role == 'VIEWER':
            return request.method in permissions.SAFE_METHODS
        
        # Read operations: All project members
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Create task: LEAD and DEVELOPER
        if view.action == 'create':
            return membership.role in ['LEAD', 'DEVELOPER']
        
        # Edit task: LEAD, DEVELOPER, or assigned user
        if view.action in ['update', 'partial_update']:
            return (
                membership.role in ['LEAD', 'DEVELOPER'] or
                obj.assigned_to == user
            )
        
        # Delete task: LEAD only
        if view.action == 'destroy':
            return membership.role == 'LEAD'
        
        return False


def get_user_project_role(user, project):
    """
    Get user's role in a specific project
    Returns: 'LEAD', 'DEVELOPER', 'VIEWER', or None
    """
    try:
        membership = ProjectMember.objects.get(project=project, user=user, is_active=True)
        return membership.role
    except ProjectMember.DoesNotExist:
        return None


def can_user_access_project(user, project):
    """
    Check if user can access a project (Jira-like)
    """
    # ADMIN can access all projects
    if user.role == 'ADMIN':
        return True
    
    # Check project membership
    return ProjectMember.objects.filter(
        project=project,
        user=user,
        is_active=True
    ).exists()


def can_user_manage_project(user, project):
    """
    Check if user can manage a project (edit settings, add/remove members)
    """
    # ADMIN can manage all projects
    if user.role == 'ADMIN':
        return True
    
    # Check if user is project LEAD
    try:
        membership = ProjectMember.objects.get(project=project, user=user, is_active=True)
        return membership.role == 'LEAD'
    except ProjectMember.DoesNotExist:
        return False


def can_user_create_task(user, project):
    """
    Check if user can create tasks in a project
    """
    if user.role == 'ADMIN':
        return True
    
    try:
        membership = ProjectMember.objects.get(project=project, user=user, is_active=True)
        return membership.role in ['LEAD', 'DEVELOPER']
    except ProjectMember.DoesNotExist:
        return False


def can_user_edit_task(user, task):
    """
    Check if user can edit a task
    """
    project = task.project
    
    if user.role == 'ADMIN':
        return True
    
    # Assigned user can edit their own tasks
    if task.assigned_to == user:
        return True
    
    # LEAD and DEVELOPER can edit any task
    try:
        membership = ProjectMember.objects.get(project=project, user=user, is_active=True)
        return membership.role in ['LEAD', 'DEVELOPER']
    except ProjectMember.DoesNotExist:
        return False
