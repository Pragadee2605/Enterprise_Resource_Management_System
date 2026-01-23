"""
Project Invitation Models
"""
from django.db import models
from django.conf import settings
import uuid
from datetime import timedelta
from django.utils import timezone


class ProjectInvitation(models.Model):
    """Model for project member invitations"""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('EXPIRED', 'Expired'),
        ('DECLINED', 'Declined'),
    ]

    id = models.CharField(primary_key=True, max_length=32, default=uuid.uuid4().hex, editable=False)
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField()
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_invitations')
    token = models.CharField(max_length=64, unique=True, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    role = models.CharField(max_length=20, default='MEMBER')
    message = models.TextField(blank=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'project_invitations'
        unique_together = [['project', 'email', 'status']]
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['email', 'status']),
        ]

    def __str__(self):
        return f"{self.email} invited to {self.project.name}"

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = uuid.uuid4().hex
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    def is_expired(self):
        return timezone.now() > self.expires_at and self.status == 'PENDING'

    def accept(self, user):
        """Accept the invitation"""
        if self.is_expired():
            self.status = 'EXPIRED'
            self.save()
            return False

        self.status = 'ACCEPTED'
        self.accepted_at = timezone.now()
        self.save()

        # Add user to project (you'll need to implement this in your Project model)
        # self.project.members.add(user)
        
        return True
