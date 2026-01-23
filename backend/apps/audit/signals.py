"""
Signals for Audit Logging
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in, user_logged_out

from apps.users.models import User
from apps.departments.models import Department
from apps.projects.models import Project, ProjectMember
from apps.tasks.models import Task
from apps.timesheets.models import Timesheet, TimesheetApproval
from .models import AuditLog


# Track which models to audit
AUDITED_MODELS = [
    User, Department, Project, ProjectMember,
    Task, Timesheet, TimesheetApproval
]


def get_model_changes(instance):
    """Get changed fields from model instance"""
    if not instance.pk:
        return {'action': 'created'}
    
    try:
        old_instance = instance.__class__.objects.get(pk=instance.pk)
        changes = {}
        
        for field in instance._meta.fields:
            field_name = field.name
            old_value = getattr(old_instance, field_name)
            new_value = getattr(instance, field_name)
            
            if old_value != new_value:
                changes[field_name] = {
                    'old': str(old_value),
                    'new': str(new_value)
                }
        
        return changes
    except instance.__class__.DoesNotExist:
        return {'action': 'created'}


@receiver(post_save)
def log_model_save(sender, instance, created, **kwargs):
    """Log model creation and updates"""
    if sender not in AUDITED_MODELS:
        return
    
    # Get the user from thread local storage if available
    user = getattr(instance, '_current_user', None)
    
    action = 'CREATE' if created else 'UPDATE'
    changes = {'action': 'created'} if created else get_model_changes(instance)
    
    if changes and changes != {'action': 'created'}:  # Only log if there are actual changes
        AuditLog.log(
            user=user,
            action=action,
            obj=instance,
            changes=changes,
            request=getattr(instance, '_current_request', None)
        )


@receiver(post_delete)
def log_model_delete(sender, instance, **kwargs):
    """Log model deletion"""
    if sender not in AUDITED_MODELS:
        return
    
    user = getattr(instance, '_current_user', None)
    
    AuditLog.log(
        user=user,
        action='DELETE',
        obj=instance,
        changes={'action': 'deleted'},
        request=getattr(instance, '_current_request', None)
    )


@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Log user login"""
    AuditLog.log(
        user=user,
        action='LOGIN',
        obj=user,
        changes={'action': 'logged_in'},
        request=request
    )


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    """Log user logout"""
    if user:
        AuditLog.log(
            user=user,
            action='LOGOUT',
            obj=user,
            changes={'action': 'logged_out'},
            request=request
        )
