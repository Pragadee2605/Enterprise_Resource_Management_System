"""
Django Signals for Task Notifications and History
"""
from django.db.models.signals import post_save, pre_save, m2m_changed
from django.dispatch import receiver
from apps.tasks.models import Task, TaskComment, TaskHistory, TaskAttachment
from apps.core.services.notification_service import NotificationService


@receiver(pre_save, sender=Task)
def track_task_changes(sender, instance, **kwargs):
    """Track task changes before saving"""
    if instance.pk:
        try:
            old_task = Task.objects.get(pk=instance.pk)
            instance._old_status = old_task.status
            instance._old_assigned_to = old_task.assigned_to
            instance._old_priority = old_task.priority
            instance._old_title = old_task.title
            instance._old_description = old_task.description
            instance._old_due_date = old_task.due_date
            instance._old_story_points = old_task.story_points
        except Task.DoesNotExist:
            instance._old_status = None
            instance._old_assigned_to = None
    else:
        instance._old_status = None
        instance._old_assigned_to = None


@receiver(post_save, sender=Task)
def create_task_history(sender, instance, created, **kwargs):
    """Create history entries for task changes"""
    # Get the user who made the change (if available in the instance)
    user = getattr(instance, 'updated_by', None) or getattr(instance, 'created_by', None)
    
    if created:
        # Task created
        TaskHistory.objects.create(
            task=instance,
            user=user,
            action='CREATED'
        )
        
        # Notify assignee if task is assigned
        if instance.assigned_to:
            NotificationService.send_task_assigned_notification(instance, instance.assigned_to)
    else:
        # Task updated - check for specific changes
        
        # Status changed
        if hasattr(instance, '_old_status') and instance._old_status and instance._old_status != instance.status:
            TaskHistory.objects.create(
                task=instance,
                user=user,
                action='STATUS_CHANGED',
                field_name='status',
                old_value=instance._old_status,
                new_value=instance.status
            )
            if user:
                NotificationService.send_task_status_changed_notification(
                    instance,
                    instance._old_status,
                    instance.status,
                    user
                )
        
        # Assignment changed
        if hasattr(instance, '_old_assigned_to') and instance._old_assigned_to != instance.assigned_to:
            old_name = instance._old_assigned_to.get_full_name() if instance._old_assigned_to else 'Unassigned'
            new_name = instance.assigned_to.get_full_name() if instance.assigned_to else 'Unassigned'
            
            TaskHistory.objects.create(
                task=instance,
                user=user,
                action='ASSIGNED',
                field_name='assigned_to',
                old_value=old_name,
                new_value=new_name
            )
            
            if instance.assigned_to:
                NotificationService.send_task_assigned_notification(instance, instance.assigned_to)
        
        # Priority changed
        if hasattr(instance, '_old_priority') and instance._old_priority and instance._old_priority != instance.priority:
            TaskHistory.objects.create(
                task=instance,
                user=user,
                action='UPDATED',
                field_name='priority',
                old_value=instance._old_priority,
                new_value=instance.priority
            )
        
        # Title changed
        if hasattr(instance, '_old_title') and instance._old_title and instance._old_title != instance.title:
            TaskHistory.objects.create(
                task=instance,
                user=user,
                action='UPDATED',
                field_name='title',
                old_value=instance._old_title,
                new_value=instance.title
            )
        
        # Due date changed
        if hasattr(instance, '_old_due_date') and instance._old_due_date != instance.due_date:
            TaskHistory.objects.create(
                task=instance,
                user=user,
                action='UPDATED',
                field_name='due_date',
                old_value=str(instance._old_due_date) if instance._old_due_date else '',
                new_value=str(instance.due_date) if instance.due_date else ''
            )
        
        # Story points changed
        if hasattr(instance, '_old_story_points') and instance._old_story_points != instance.story_points:
            TaskHistory.objects.create(
                task=instance,
                user=user,
                action='UPDATED',
                field_name='story_points',
                old_value=str(instance._old_story_points) if instance._old_story_points else '',
                new_value=str(instance.story_points) if instance.story_points else ''
            )


@receiver(post_save, sender=TaskComment)
def create_comment_history(sender, instance, created, **kwargs):
    """Create history entry and send notifications for new comments"""
    if created:
        # Create history entry
        TaskHistory.objects.create(
            task=instance.task,
            user=instance.author,
            action='COMMENTED'
        )
        
        # Send notifications
        try:
            NotificationService.send_comment_notification(instance)
        except Exception as e:
            print(f"Failed to send comment notification: {e}")


@receiver(post_save, sender=TaskAttachment)
def create_attachment_history(sender, instance, created, **kwargs):
    """Create history entry when attachment is added"""
    if created:
        TaskHistory.objects.create(
            task=instance.task,
            user=instance.uploaded_by,
            action='ATTACHMENT_ADDED',
            new_value=instance.file_name
        )


# Use m2m_changed signal for mentions since it's a many-to-many field
@receiver(m2m_changed, sender=TaskComment.mentions.through)
def send_mention_notifications(sender, instance, action, pk_set, **kwargs):
    """Send notifications when users are mentioned in comments"""
    if action == "post_add" and pk_set:
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            for user_id in pk_set:
                try:
                    mentioned_user = User.objects.get(pk=user_id)
                    NotificationService.send_mention_notification(instance, mentioned_user)
                except User.DoesNotExist:
                    pass
        except Exception as e:
            print(f"Failed to send mention notification: {e}")
