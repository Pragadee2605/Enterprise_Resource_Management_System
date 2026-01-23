"""
Audit Models
"""
import uuid
from django.db import models
from apps.users.models import User


class AuditLog(models.Model):
    """Audit log model for tracking all system changes"""
    
    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('APPROVE', 'Approve'),
        ('REJECT', 'Reject'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=255)
    object_repr = models.CharField(max_length=255)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['model_name', 'action']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"{self.user.email if self.user else 'System'} - {self.action} - {self.model_name} - {self.timestamp}"
    
    @classmethod
    def log(cls, user, action, obj, changes=None, request=None):
        """Helper method to create audit log entry"""
        ip_address = None
        user_agent = ''
        
        if request:
            # Get IP address
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0]
            else:
                ip_address = request.META.get('REMOTE_ADDR')
            
            # Get user agent
            user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        return cls.objects.create(
            user=user,
            action=action,
            model_name=obj.__class__.__name__,
            object_id=str(obj.pk),
            object_repr=str(obj),
            changes=changes or {},
            ip_address=ip_address,
            user_agent=user_agent
        )
