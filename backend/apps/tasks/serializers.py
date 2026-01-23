"""
Task Serializers
"""
from rest_framework import serializers
from apps.tasks.models import (
    Task, IssueType, Sprint, TaskAttachment,
    TaskComment, TaskWatcher, TaskHistory, Label
)
from apps.users.serializers import UserSerializer
from apps.projects.serializers import ProjectListSerializer


# Define simple serializers first to avoid circular dependencies

class IssueTypeSerializer(serializers.ModelSerializer):
    """Serializer for IssueType"""
    class Meta:
        model = IssueType
        fields = ['id', 'name', 'icon', 'color', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class LabelSerializer(serializers.ModelSerializer):
    """Serializer for Label"""
    class Meta:
        model = Label
        fields = ['id', 'name', 'color', 'project', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SprintSerializer(serializers.ModelSerializer):
    """Serializer for Sprint"""
    project_name = serializers.CharField(source='project.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    duration_days = serializers.IntegerField(read_only=True)
    is_current = serializers.BooleanField(read_only=True)
    task_count = serializers.SerializerMethodField()
    completed_task_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Sprint
        fields = [
            'id', 'name', 'description', 'project', 'project_name',
            'status', 'start_date', 'end_date', 'goal',
            'created_by', 'created_by_name', 'duration_days', 'is_current',
            'task_count', 'completed_task_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def get_task_count(self, obj):
        return obj.tasks.count()
    
    def get_completed_task_count(self, obj):
        return obj.tasks.filter(status='DONE').count()
    
    def validate(self, data):
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })
        
        return data
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class TaskAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for TaskAttachment"""
    uploaded_by_name = serializers.SerializerMethodField()
    file_url = serializers.FileField(source='file', read_only=True)
    file_size = serializers.IntegerField(required=False)
    file_type = serializers.CharField(required=False, allow_blank=True)
    file_name = serializers.CharField(required=False)
    
    class Meta:
        model = TaskAttachment
        fields = [
            'id', 'task', 'file', 'file_url', 'file_name', 'file_size',
            'file_type', 'description', 'uploaded_by', 'uploaded_by_name',
            'created_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'created_at']
    
    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name() if obj.uploaded_by else 'Unknown'
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['uploaded_by'] = request.user
        
        # Extract file metadata from the uploaded file
        file_obj = validated_data.get('file')
        if file_obj:
            if 'file_name' not in validated_data or not validated_data['file_name']:
                validated_data['file_name'] = file_obj.name
            if 'file_size' not in validated_data or not validated_data['file_size']:
                validated_data['file_size'] = file_obj.size
            if 'file_type' not in validated_data or not validated_data['file_type']:
                validated_data['file_type'] = file_obj.content_type if hasattr(file_obj, 'content_type') else 'application/octet-stream'
        
        return super().create(validated_data)


# Task Serializers


class TaskSerializer(serializers.ModelSerializer):
    """Full serializer for Task"""
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    hours_variance = serializers.FloatField(read_only=True)
    assigned_to_details = UserSerializer(source='assigned_to', read_only=True)
    project_details = ProjectListSerializer(source='project', read_only=True)
    
    # New fields for advanced features
    issue_type_details = IssueTypeSerializer(source='issue_type', read_only=True)
    sprint_details = SprintSerializer(source='sprint', read_only=True)
    parent_epic_title = serializers.CharField(source='parent_epic.title', read_only=True)
    labels_details = LabelSerializer(source='labels', many=True, read_only=True)
    attachments = TaskAttachmentSerializer(many=True, read_only=True)
    comments_count = serializers.SerializerMethodField()
    watchers_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'project', 'project_name', 'project_details',
            'assigned_to', 'assigned_to_name', 'assigned_to_details',
            'created_by', 'created_by_name', 'priority', 'status',
            'estimated_hours', 'actual_hours', 'hours_variance',
            'start_date', 'due_date', 'completed_date',
            'is_overdue', 'is_active', 'created_at', 'updated_at',
            # New fields
            'issue_type', 'issue_type_details', 'sprint', 'sprint_details',
            'parent_epic', 'parent_epic_title', 'story_points', 'kanban_order',
            'labels', 'labels_details',
            'attachments', 'comments_count', 'watchers_count'
        ]
        read_only_fields = ['id', 'created_by', 'completed_date', 'created_at', 'updated_at']
    
    def get_comments_count(self, obj):
        return obj.comments.count()
    
    def get_watchers_count(self, obj):
        return obj.watchers.count()
    
    def validate(self, data):
        """Validate task dates"""
        start_date = data.get('start_date')
        due_date = data.get('due_date')
        
        if start_date and due_date and start_date > due_date:
            raise serializers.ValidationError({
                'due_date': 'Due date must be after start date.'
            })
        
        return data


class TaskListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing tasks"""
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    assigned_to_details = UserSerializer(source='assigned_to', read_only=True)
    project_details = ProjectListSerializer(source='project', read_only=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'project', 'project_name', 'project_details',
            'assigned_to', 'assigned_to_name', 'assigned_to_details',
            'priority', 'status', 'due_date', 'is_overdue', 'is_active',
            'story_points', 'issue_type'
        ]


class TaskCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating tasks"""
    
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'project', 'assigned_to',
            'priority', 'status', 'estimated_hours', 'actual_hours',
            'start_date', 'due_date', 'is_active'
        ]
    
    def validate(self, data):
        """Validate task data"""
        start_date = data.get('start_date')
        due_date = data.get('due_date')
        
        if start_date and due_date and start_date > due_date:
            raise serializers.ValidationError({
                'due_date': 'Due date must be after start date.'
            })
        
        return data
    
    def create(self, validated_data):
        """Set created_by to current user"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class TaskUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating tasks"""
    
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'assigned_to', 'priority', 'status',
            'estimated_hours', 'actual_hours', 'start_date', 'due_date', 'is_active'
        ]
    
    def validate(self, data):
        """Validate task data"""
        start_date = data.get('start_date', self.instance.start_date)
        due_date = data.get('due_date', self.instance.due_date)
        
        if start_date and due_date and start_date > due_date:
            raise serializers.ValidationError({
                'due_date': 'Due date must be after start date.'
            })
        
        return data


class UpdateTaskStatusSerializer(serializers.Serializer):
    """Serializer for updating task status"""
    status = serializers.ChoiceField(choices=Task.STATUS_CHOICES)


class UpdateTaskHoursSerializer(serializers.Serializer):
    """Serializer for updating actual hours"""
    actual_hours = serializers.DecimalField(max_digits=6, decimal_places=2, min_value=0)


# Additional serializers for comments, watchers, and history

class TaskCommentSerializer(serializers.ModelSerializer):
    """Serializer for TaskComment"""
    author_name = serializers.SerializerMethodField()
    author_username = serializers.SerializerMethodField()
    mentions_details = UserSerializer(source='mentions', many=True, read_only=True)
    reply_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskComment
        fields = [
            'id', 'task', 'author', 'author_name', 'author_username',
            'parent_comment', 'content', 'mentions', 'mentions_details',
            'reply_count', 'is_edited', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'author', 'is_edited', 'created_at', 'updated_at']
    
    def get_author_name(self, obj):
        return obj.author.get_full_name() if obj.author else 'Unknown'
    
    def get_author_username(self, obj):
        return obj.author.email if obj.author else 'unknown'
    
    def get_reply_count(self, obj):
        return obj.replies.count()
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['author'] = request.user
        
        # Extract mentions from validated_data if they are in the input
        mentions = validated_data.pop('mentions', [])
        comment = super().create(validated_data)
        
        # Add mentions
        if mentions:
            comment.mentions.set(mentions)
        
        return comment


class TaskWatcherSerializer(serializers.ModelSerializer):
    """Serializer for TaskWatcher"""
    user_name = serializers.SerializerMethodField()
    user_username = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskWatcher
        fields = [
            'id', 'task', 'user', 'user_name', 'user_username',
            'notify_on_comment', 'notify_on_status_change', 'notify_on_assignment',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else 'Unknown'
    
    def get_user_username(self, obj):
        return obj.user.email if obj.user else 'unknown'


class TaskHistorySerializer(serializers.ModelSerializer):
    """Serializer for TaskHistory"""
    user_name = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = TaskHistory
        fields = [
            'id', 'task', 'user', 'user_name', 'action', 'action_display',
            'field_name', 'old_value', 'new_value', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else 'System'
