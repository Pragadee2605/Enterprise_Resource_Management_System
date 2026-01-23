"""
Serializers for Timesheets App
"""
from rest_framework import serializers
from django.utils import timezone
from .models import Timesheet, TimesheetApproval
from apps.users.serializers import UserSerializer
from apps.projects.serializers import ProjectSerializer
from apps.tasks.serializers import TaskSerializer


class TimesheetApprovalSerializer(serializers.ModelSerializer):
    """Serializer for Timesheet Approval"""
    approved_by_details = UserSerializer(source='approved_by', read_only=True)
    
    class Meta:
        model = TimesheetApproval
        fields = [
            'id', 'timesheet', 'approved_by', 'approved_by_details',
            'status', 'comments', 'approved_at'
        ]
        read_only_fields = ['id', 'approved_at']


class TimesheetSerializer(serializers.ModelSerializer):
    """Serializer for Timesheet model"""
    employee_details = UserSerializer(source='employee', read_only=True)
    project_details = ProjectSerializer(source='project', read_only=True)
    task_details = TaskSerializer(source='task', read_only=True)
    approvals = TimesheetApprovalSerializer(many=True, read_only=True)
    is_editable = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Timesheet
        fields = [
            'id', 'employee', 'employee_details', 'project', 'project_details',
            'task', 'task_details', 'date', 'hours', 'description',
            'status', 'submitted_at', 'approvals', 'is_editable',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'submitted_at', 'created_at', 'updated_at']

    def validate(self, data):
        """Validate timesheet data"""
        # Check if timesheet already exists for this combination
        employee = data.get('employee')
        project = data.get('project')
        task = data.get('task')
        date = data.get('date')
        
        # Exclude current instance during update
        qs = Timesheet.objects.filter(
            employee=employee,
            project=project,
            task=task,
            date=date
        )
        
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        
        if qs.exists():
            raise serializers.ValidationError(
                "A timesheet entry already exists for this combination."
            )
        
        # Validate that task belongs to project
        if task and task.project != project:
            raise serializers.ValidationError(
                "Selected task does not belong to the selected project."
            )
        
        # Validate date is not in future
        if date > timezone.now().date():
            raise serializers.ValidationError(
                "Cannot create timesheet for future dates."
            )
        
        return data

    def validate_hours(self, value):
        """Validate hours"""
        if value < 0.5:
            raise serializers.ValidationError("Minimum 0.5 hours required.")
        if value > 24:
            raise serializers.ValidationError("Maximum 24 hours allowed.")
        return value


class TimesheetCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating timesheets"""
    description = serializers.CharField(required=False, allow_blank=True, default='')
    
    class Meta:
        model = Timesheet
        fields = ['employee', 'project', 'task', 'date', 'hours', 'description']

    def validate(self, data):
        """Validate timesheet data"""
        # Check if timesheet already exists
        if Timesheet.objects.filter(
            employee=data['employee'],
            project=data['project'],
            task=data.get('task'),
            date=data['date']
        ).exists():
            raise serializers.ValidationError(
                "A timesheet entry already exists for this combination."
            )
        
        # Validate task belongs to project
        if data.get('task') and data['task'].project != data['project']:
            raise serializers.ValidationError(
                "Selected task does not belong to the selected project."
            )
        
        # Validate date is not in future
        if data['date'] > timezone.now().date():
            raise serializers.ValidationError(
                "Cannot create timesheet for future dates."
            )
        
        return data


class TimesheetUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating timesheets"""
    description = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Timesheet
        fields = ['project', 'task', 'date', 'hours', 'description']

    def validate(self, data):
        """Validate timesheet can be updated"""
        if self.instance and not self.instance.is_editable:
            raise serializers.ValidationError(
                "Cannot update timesheet that has been submitted or approved."
            )
        
        # Validate task belongs to project
        project = data.get('project', self.instance.project)
        task = data.get('task', self.instance.task)
        
        if task and task.project != project:
            raise serializers.ValidationError(
                "Selected task does not belong to the selected project."
            )
        
        return data


class TimesheetApproveSerializer(serializers.Serializer):
    """Serializer for approving/rejecting timesheets"""
    status = serializers.ChoiceField(choices=['APPROVED', 'REJECTED'])
    comments = serializers.CharField(required=False, allow_blank=True)

    def validate_comments(self, value):
        """Require comments for rejection"""
        if self.initial_data.get('status') == 'REJECTED' and not value:
            raise serializers.ValidationError(
                "Comments are required when rejecting a timesheet."
            )
        return value
