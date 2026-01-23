"""
Project Serializers
"""
from rest_framework import serializers
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from apps.projects.models import Project, ProjectMember, ProjectInvitation
from apps.users.serializers import UserSerializer
from apps.departments.serializers import DepartmentListSerializer


class ProjectMemberSerializer(serializers.ModelSerializer):
    """Serializer for ProjectMember"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = ProjectMember
        fields = [
            'id', 'project', 'user', 'user_name', 'user_email', 
            'user_details', 'role', 'joined_date', 'is_active'
        ]
        read_only_fields = ['id', 'joined_date']


class ProjectSerializer(serializers.ModelSerializer):
    """Full serializer for Project"""
    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    duration_days = serializers.IntegerField(read_only=True)
    manager_details = UserSerializer(source='manager', read_only=True)
    department_details = DepartmentListSerializer(source='department', read_only=True)
    project_members = ProjectMemberSerializer(source='projectmember_set', many=True, read_only=True)
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'code', 'description', 'department', 'department_name',
            'department_details', 'manager', 'manager_name', 'manager_details',
            'budget', 'start_date', 'end_date', 'status', 'is_active',
            'member_count', 'is_overdue', 'duration_days', 'project_members',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate project dates"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })
        
        return data
    
    def validate_code(self, value):
        """Validate project code is unique"""
        value = value.upper()
        instance = self.instance
        if instance and Project.objects.exclude(pk=instance.pk).filter(code=value).exists():
            raise serializers.ValidationError("Project code must be unique.")
        elif not instance and Project.objects.filter(code=value).exists():
            raise serializers.ValidationError("Project code must be unique.")
        return value


class ProjectListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing projects"""
    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    total_tasks = serializers.SerializerMethodField()
    completed_tasks = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'code', 'description', 'department_name', 'manager_name',
            'start_date', 'end_date', 'status', 'budget', 'member_count', 
            'total_tasks', 'completed_tasks', 'is_overdue', 'is_active'
        ]
    
    def get_total_tasks(self, obj):
        """Get total task count for the project"""
        return obj.tasks.count()
    
    def get_completed_tasks(self, obj):
        """Get completed task count for the project"""
        return obj.tasks.filter(status='COMPLETED').count()


class ProjectCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating projects"""
    
    code = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Project
        fields = [
            'name', 'code', 'description', 'department', 'manager',
            'budget', 'start_date', 'end_date', 'status', 'is_active'
        ]
    
    def validate(self, data):
        """Validate project data"""
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })
        return data
    
    def create(self, validated_data):
        """
        Create project and auto-add creator as LEAD member (Jira-like behavior)
        """
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None
        
        # Auto-set manager to current user if not provided
        if not validated_data.get('manager') and user:
            validated_data['manager'] = user
        
        # Auto-generate code from name if empty or not provided
        if not validated_data.get('code'):
            import re
            name = validated_data.get('name', '')
            words = re.findall(r'\b\w', name.upper())
            base_code = ''.join(words)[:10] or 'PROJ'
            
            code = base_code
            counter = 1
            while Project.objects.filter(code=code).exists():
                code = f"{base_code}{counter}"
                counter += 1
            validated_data['code'] = code
        else:
            validated_data['code'] = validated_data['code'].upper()
        
        # Create the project
        project = super().create(validated_data)
        
        # JIRA ARCHITECTURE: Auto-add creator as project LEAD member
        if user:
            ProjectMember.objects.create(
                project=project,
                user=user,
                role='LEAD',
                is_active=True
            )
        
        return project
    
    def validate_code(self, value):
        """Validate project code"""
        value = value.upper()
        if Project.objects.filter(code=value).exists():
            raise serializers.ValidationError("Project code must be unique.")
        return value


class ProjectUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating projects"""
    
    class Meta:
        model = Project
        fields = [
            'name', 'code', 'description', 'department', 'manager',
            'budget', 'start_date', 'end_date', 'status', 'is_active'
        ]
    
    def validate(self, data):
        """Validate project data"""
        start_date = data.get('start_date', self.instance.start_date)
        end_date = data.get('end_date', self.instance.end_date)
        
        if start_date > end_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })
        return data
    
    def validate_code(self, value):
        """Validate project code"""
        value = value.upper()
        if Project.objects.exclude(pk=self.instance.pk).filter(code=value).exists():
            raise serializers.ValidationError("Project code must be unique.")
        return value


class AddProjectMemberSerializer(serializers.Serializer):
    """Serializer for adding members to project"""
    user_id = serializers.UUIDField()
    role = serializers.ChoiceField(choices=ProjectMember.ROLE_CHOICES)
    
    def validate_user_id(self, value):
        """Validate user exists"""
        from apps.users.models import User
        if not User.objects.filter(id=value).exists():
            raise serializers.ValidationError("User not found.")
        return value


class ProjectInvitationSerializer(serializers.ModelSerializer):
    """Serializer for ProjectInvitation"""
    invited_by_name = serializers.CharField(source='invited_by.get_full_name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    
    class Meta:
        model = ProjectInvitation
        fields = [
            'id', 'project', 'project_name', 'invited_by', 'invited_by_name',
            'email', 'role', 'token', 'status', 'message',
            'created_at', 'expires_at', 'accepted_at'
        ]
        read_only_fields = ['id', 'token', 'status', 'created_at', 'expires_at', 'accepted_at']


class InviteMembersSerializer(serializers.Serializer):
    """Serializer for inviting members via email"""
    emails = serializers.ListField(
        child=serializers.EmailField(),
        allow_empty=False,
        help_text="List of email addresses to invite"
    )
    role = serializers.ChoiceField(
        choices=ProjectMember.ROLE_CHOICES,
        default='DEVELOPER',
        help_text="Role to assign to invited members"
    )
    message = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        help_text="Optional message to include in invitation email"
    )
    
    def validate_emails(self, emails):
        """Validate and deduplicate emails"""
        # Remove duplicates while preserving order
        unique_emails = []
        seen = set()
        for email in emails:
            email_lower = email.lower()
            if email_lower not in seen:
                unique_emails.append(email)
                seen.add(email_lower)
        
        if not unique_emails:
            raise serializers.ValidationError("At least one email is required.")
        
        return unique_emails
    
    def validate(self, data):
        """Additional validation"""
        project = self.context.get('project')
        emails = data.get('emails', [])
        
        if not project:
            raise serializers.ValidationError("Project context is required.")
        
        # Check for existing members
        from apps.users.models import User
        existing_members = ProjectMember.objects.filter(
            project=project,
            user__email__in=emails,
            is_active=True
        ).values_list('user__email', flat=True)
        
        if existing_members:
            raise serializers.ValidationError({
                'emails': f"Following emails are already project members: {', '.join(existing_members)}"
            })
        
        # Check for pending invitations
        pending_invitations = ProjectInvitation.objects.filter(
            project=project,
            email__in=emails,
            status='PENDING'
        ).values_list('email', flat=True)
        
        if pending_invitations:
            raise serializers.ValidationError({
                'emails': f"Following emails already have pending invitations: {', '.join(pending_invitations)}"
            })
        
        return data


class AcceptInvitationSerializer(serializers.Serializer):
    """Serializer for accepting invitation"""
    token = serializers.UUIDField(help_text="Invitation token")
    
    def validate_token(self, token):
        """Validate invitation token"""
        try:
            invitation = ProjectInvitation.objects.get(token=token)
        except ProjectInvitation.DoesNotExist:
            raise serializers.ValidationError("Invalid invitation token.")
        
        if invitation.status != 'PENDING':
            raise serializers.ValidationError(f"Invitation is {invitation.status.lower()}.")
        
        if invitation.is_expired():
            invitation.status = 'EXPIRED'
            invitation.save()
            raise serializers.ValidationError("Invitation has expired.")
        
        return token

