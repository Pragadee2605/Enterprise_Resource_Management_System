"""
Email Notification Service
Sends email notifications for task events
"""
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()


class NotificationService:
    """Service for sending email notifications"""

    @staticmethod
    def send_task_assigned_notification(task, assigned_to):
        """Send notification when task is assigned"""
        try:
            subject = f'Task Assigned: {task.title}'
            context = {
                'task': task,
                'user': assigned_to,
                'task_url': f'{settings.FRONTEND_URL}/tasks/{task.id}',
            }
            
            message = f"""
            Hi {assigned_to.first_name},

            You have been assigned to a new task:

            Task: {task.title}
            Priority: {task.priority}
            Due Date: {task.due_date or 'Not set'}

            View task: {context['task_url']}

            Best regards,
            ERMS Team
            """

            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [assigned_to.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"Failed to send assignment notification: {e}")

    @staticmethod
    def send_task_status_changed_notification(task, old_status, new_status, changed_by):
        """Send notification when task status changes"""
        try:
            # Get watchers
            watchers = task.watchers.filter(notify_on_status_change=True)
            recipients = [w.user.email for w in watchers if w.user.email]

            if not recipients:
                return

            subject = f'Task Status Changed: {task.title}'
            message = f"""
            Hi,

            Task status has been updated:

            Task: {task.title}
            Changed by: {changed_by.first_name} {changed_by.last_name}
            Old Status: {old_status}
            New Status: {new_status}

            View task: {settings.FRONTEND_URL}/tasks/{task.id}

            Best regards,
            ERMS Team
            """

            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                recipients,
                fail_silently=False,
            )
        except Exception as e:
            print(f"Failed to send status change notification: {e}")

    @staticmethod
    def send_comment_notification(comment):
        """Send notification for new comments"""
        try:
            task = comment.task
            watchers = task.watchers.filter(notify_on_comment=True)
            
            # Notify watchers
            recipients = [w.user.email for w in watchers if w.user.email and w.user.id != comment.author.id]

            # Add mentioned users
            mentioned_users = User.objects.filter(id__in=comment.mentions.values_list('id', flat=True))
            recipients.extend([u.email for u in mentioned_users if u.email and u.id != comment.author.id])

            # Remove duplicates
            recipients = list(set(recipients))

            if not recipients:
                return

            subject = f'New Comment on Task: {task.title}'
            message = f"""
            Hi,

            {comment.author.first_name} {comment.author.last_name} commented on task "{task.title}":

            {comment.content}

            View task: {settings.FRONTEND_URL}/tasks/{task.id}

            Best regards,
            ERMS Team
            """

            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                recipients,
                fail_silently=False,
            )
        except Exception as e:
            print(f"Failed to send comment notification: {e}")

    @staticmethod
    def send_mention_notification(comment, mentioned_user):
        """Send notification when user is mentioned"""
        try:
            if not mentioned_user.email:
                return

            task = comment.task
            subject = f'You were mentioned in: {task.title}'
            message = f"""
            Hi {mentioned_user.first_name},

            {comment.author.first_name} {comment.author.last_name} mentioned you in a comment:

            Task: {task.title}
            Comment: {comment.content}

            View task: {settings.FRONTEND_URL}/tasks/{task.id}

            Best regards,
            ERMS Team
            """

            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [mentioned_user.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"Failed to send mention notification: {e}")

    @staticmethod
    def send_task_due_soon_notification(task):
        """Send notification when task is due soon"""
        try:
            if not task.assigned_to or not task.assigned_to.email:
                return

            subject = f'Task Due Soon: {task.title}'
            message = f"""
            Hi {task.assigned_to.first_name},

            Reminder: Your task is due soon!

            Task: {task.title}
            Due Date: {task.due_date}
            Priority: {task.priority}

            View task: {settings.FRONTEND_URL}/tasks/{task.id}

            Best regards,
            ERMS Team
            """

            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [task.assigned_to.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"Failed to send due soon notification: {e}")
