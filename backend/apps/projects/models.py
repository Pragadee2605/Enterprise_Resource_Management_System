"""
Project Models
"""
import uuid
from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from apps.users.models import User
from apps.departments.models import Department


class Project(models.Model):
    """Project model for tracking projects"""
    
    STATUS_CHOICES = [
        ('PLANNING', 'Planning'),
        ('ACTIVE', 'Active'),
        ('ON_HOLD', 'On Hold'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='projects'
    )
    manager = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='managed_projects'
    )
    members = models.ManyToManyField(
        User,
        through='ProjectMember',
        related_name='projects'
    )
    budget = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        null=True,
        blank=True
    )
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNING')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'projects'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'is_active']),
            models.Index(fields=['department', 'status']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.name}"
    
    @property
    def is_overdue(self):
        """Check if project is overdue"""
        from django.utils import timezone
        return self.end_date < timezone.now().date() and self.status not in ['COMPLETED', 'CANCELLED']
    
    @property
    def duration_days(self):
        """Calculate project duration in days"""
        return (self.end_date - self.start_date).days
    
    @property
    def member_count(self):
        """Get count of project members"""
        return self.members.count()


class ProjectMember(models.Model):
    """Through model for Project-User many-to-many relationship"""
    
    ROLE_CHOICES = [
        ('LEAD', 'Lead'),
        ('DEVELOPER', 'Developer'),
        ('TESTER', 'Tester'),
        ('ANALYST', 'Analyst'),
        ('DESIGNER', 'Designer'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    joined_date = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'project_members'
        unique_together = ['project', 'user']
        indexes = [
            models.Index(fields=['project', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.project.name} ({self.role})"


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
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='invitations')
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
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
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['email', 'status']),
            models.Index(fields=['project', 'status']),
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
