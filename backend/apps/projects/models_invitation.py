"""
Project Invitation Models
Handles team member invitations to projects
"""
from django.db import models
from django.utils import timezone
import uuid


class ProjectInvitation(models.Model):
    """
    Invitation to join a project
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('EXPIRED', 'Expired'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='invitations')
    invited_by = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='sent_invitations')
    email = models.EmailField(max_length=255)
    role = models.CharField(max_length=20, default='DEVELOPER')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    message = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'project_invitations'
        ordering = ['-created_at']
        unique_together = [['project', 'email', 'status']]
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['email', 'status']),
        ]
    
    def __str__(self):
        return f"{self.email} invited to {self.project.name}"
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            # Set expiration to 7 days from now
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        super().save(*args, **kwargs)
    
    def is_expired(self):
        """Check if invitation has expired"""
        return timezone.now() > self.expires_at
    
    def can_accept(self):
        """Check if invitation can be accepted"""
        return self.status == 'PENDING' and not self.is_expired()
