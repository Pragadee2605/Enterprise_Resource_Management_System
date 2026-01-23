"""
Task Models with Advanced Features
"""
import uuid
from django.db import models
from django.core.validators import MinValueValidator
from apps.users.models import User
from apps.projects.models import Project


class IssueType(models.Model):
    """Issue Type Model (Task, Bug, Story, Epic)"""
    
    TYPE_CHOICES = [
        ('TASK', 'Task'),
        ('BUG', 'Bug'),
        ('STORY', 'User Story'),
        ('EPIC', 'Epic'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, choices=TYPE_CHOICES, unique=True)
    icon = models.CharField(max_length=50, default='📝')  # Emoji or icon class
    color = models.CharField(max_length=7, default='#4f46e5')  # Hex color
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'issue_types'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.icon} {self.get_name_display()}"


class Sprint(models.Model):
    """Sprint Model for Agile Project Management"""
    
    STATUS_CHOICES = [
        ('PLANNED', 'Planned'),
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='sprints'
    )
    goal = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNED')
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_sprints'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sprints'
        ordering = ['-start_date']
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.project.code})"
    
    @property
    def duration_days(self):
        """Calculate sprint duration in days"""
        return (self.end_date - self.start_date).days + 1
    
    @property
    def is_current(self):
        """Check if sprint is currently active"""
        from django.utils import timezone
        today = timezone.now().date()
        return self.start_date <= today <= self.end_date and self.status == 'ACTIVE'


class Label(models.Model):
    """Label Model for task categorization"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default='#3b82f6')  # Hex color
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='labels'
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'labels'
        ordering = ['name']
        unique_together = ['project', 'name']
        indexes = [
            models.Index(fields=['project', 'name']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.project.code})"


class Task(models.Model):
    """Task model for project tasks"""
    
    STATUS_CHOICES = [
        ('TODO', 'To Do'),
        ('IN_PROGRESS', 'In Progress'),
        ('IN_REVIEW', 'In Review'),
        ('COMPLETED', 'Completed'),
        ('BLOCKED', 'Blocked'),
    ]
    
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    issue_type = models.ForeignKey(
        IssueType,
        on_delete=models.SET_NULL,
        null=True,
        related_name='tasks',
        default=None
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='tasks'
    )
    sprint = models.ForeignKey(
        Sprint,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    parent_epic = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='child_tasks',
        limit_choices_to={'issue_type__name': 'EPIC'}
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_tasks'
    )
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='TODO')
    story_points = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)]
    )
    estimated_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        null=True,
        blank=True
    )
    actual_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        default=0
    )
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    completed_date = models.DateTimeField(null=True, blank=True)
    labels = models.ManyToManyField(Label, related_name='tasks', blank=True)
    kanban_order = models.IntegerField(default=0)  # For drag-and-drop ordering
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tasks'
        ordering = ['kanban_order', '-created_at']
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['priority', 'due_date']),
            models.Index(fields=['sprint', 'status']),
            models.Index(fields=['kanban_order']),
            models.Index(fields=['project', 'sprint', 'status']),  # Compound index for filtering
            models.Index(fields=['due_date']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.project.code})"
    
    @property
    def is_overdue(self):
        """Check if task is overdue"""
        from django.utils import timezone
        return (
            self.due_date and
            self.due_date < timezone.now().date() and
            self.status not in ['COMPLETED']
        )
    
    @property
    def hours_variance(self):
        """Calculate variance between estimated and actual hours"""
        if self.estimated_hours:
            return float(self.actual_hours - self.estimated_hours)
        return 0


class TaskAttachment(models.Model):
    """Task Attachment Model for file uploads"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_attachments'
    )
    file = models.FileField(upload_to='task_attachments/%Y/%m/%d/')
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField()  # Size in bytes
    file_type = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'task_attachments'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.file_name} - {self.task.title}"
    
    @property
    def file_size_mb(self):
        """Return file size in MB"""
        return round(self.file_size / (1024 * 1024), 2)


class TaskComment(models.Model):
    """Task Comment Model with @mentions support"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='task_comments'
    )
    content = models.TextField()
    mentions = models.ManyToManyField(
        User,
        related_name='mentioned_in_comments',
        blank=True
    )
    parent_comment = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies'
    )
    is_edited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'task_comments'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['task', 'created_at']),
        ]
    
    def __str__(self):
        return f"Comment by {self.author} on {self.task.title}"


class TaskWatcher(models.Model):
    """Task Watcher Model for subscriptions"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='watchers'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='watched_tasks'
    )
    notify_on_comment = models.BooleanField(default=True)
    notify_on_status_change = models.BooleanField(default=True)
    notify_on_assignment = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'task_watchers'
        unique_together = ['task', 'user']
        indexes = [
            models.Index(fields=['task', 'user']),
        ]
    
    def __str__(self):
        return f"{self.user} watching {self.task.title}"


class TaskHistory(models.Model):
    """Task History Model for activity tracking"""
    
    ACTION_CHOICES = [
        ('CREATED', 'Created'),
        ('UPDATED', 'Updated'),
        ('COMMENTED', 'Commented'),
        ('STATUS_CHANGED', 'Status Changed'),
        ('ASSIGNED', 'Assigned'),
        ('ATTACHMENT_ADDED', 'Attachment Added'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='history'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='task_history'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    field_name = models.CharField(max_length=50, blank=True)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'task_history'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['task', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.user} {self.action} {self.task.title}"
    def mark_completed(self):
        """Mark task as completed"""
        from django.utils import timezone
        self.status = 'COMPLETED'
        self.completed_date = timezone.now()
        self.save()
