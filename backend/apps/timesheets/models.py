"""
Timesheet Models
"""
import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.users.models import User
from apps.projects.models import Project
from apps.tasks.models import Task


class Timesheet(models.Model):
    """Timesheet model for tracking employee hours"""
    
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='timesheets'
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='timesheets'
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='timesheets'
    )
    date = models.DateField()
    hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(0.5),
            MaxValueValidator(24)
        ]
    )
    description = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'timesheets'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['employee', 'status']),
            models.Index(fields=['project', 'date']),
            models.Index(fields=['date']),
        ]
        unique_together = ['employee', 'project', 'task', 'date']
    
    def __str__(self):
        return f"{self.employee.email} - {self.date} - {self.hours}h"
    
    @property
    def is_editable(self):
        """Check if timesheet can be edited"""
        return self.status in ['DRAFT', 'REJECTED']
    
    def submit(self):
        """Submit timesheet for approval"""
        from django.utils import timezone
        self.status = 'SUBMITTED'
        self.submitted_at = timezone.now()
        self.save()
    
    def approve(self, approved_by):
        """Approve timesheet"""
        self.status = 'APPROVED'
        self.save()
        
        # Create approval record
        TimesheetApproval.objects.create(
            timesheet=self,
            approved_by=approved_by,
            status='APPROVED'
        )
    
    def reject(self, rejected_by, reason):
        """Reject timesheet"""
        self.status = 'REJECTED'
        self.save()
        
        # Create approval record
        TimesheetApproval.objects.create(
            timesheet=self,
            approved_by=rejected_by,
            status='REJECTED',
            comments=reason
        )


class TimesheetApproval(models.Model):
    """Timesheet approval tracking"""
    
    STATUS_CHOICES = [
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timesheet = models.ForeignKey(
        Timesheet,
        on_delete=models.CASCADE,
        related_name='approvals'
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='timesheet_approvals'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    comments = models.TextField(blank=True)
    approved_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'timesheet_approvals'
        ordering = ['-approved_at']
    
    def __str__(self):
        return f"{self.timesheet} - {self.status} by {self.approved_by.email}"
