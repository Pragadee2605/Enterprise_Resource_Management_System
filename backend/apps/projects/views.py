"""
Project Views
"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from apps.projects.models import Project, ProjectMember, ProjectInvitation
from apps.projects.serializers import (
    ProjectSerializer,
    ProjectListSerializer,
    ProjectCreateSerializer,
    ProjectUpdateSerializer,
    ProjectMemberSerializer,
    AddProjectMemberSerializer,
    ProjectInvitationSerializer,
    InviteMembersSerializer,
    AcceptInvitationSerializer
)
from apps.users.permissions import CanManageProjects
from apps.projects.permissions import ProjectPermission
from apps.core.exceptions import APIResponse


class ProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Project management - Pure Jira Architecture
    
    System Roles:
    - ADMIN: System administrator (manage users, settings) - CANNOT access user projects
    - USER: Regular user (all users are equal) - can create projects
    
    Project Visibility:
    - Users ONLY see projects they created or are members of
    - Complete project privacy - no cross-project visibility
    
    Project Roles (within each project):
    - LEAD: Project creator, full control (edit project, manage members, all operations)
    - DEVELOPER: Team member, can create/edit tasks
    - VIEWER: Read-only access
    """
    queryset = Project.objects.all()
    permission_classes = [IsAuthenticated, ProjectPermission]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'code', 'start_date', 'end_date', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter and annotate queryset"""
        queryset = super().get_queryset()
        queryset = queryset.select_related('department', 'manager')
        queryset = queryset.prefetch_related('members', 'projectmember_set__user')
        # Don't annotate member_count - use the model property instead
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param.upper())
        
        # Filter by department
        department = self.request.query_params.get('department')
        if department:
            queryset = queryset.filter(department_id=department)
        
        # Filter by manager
        manager = self.request.query_params.get('manager')
        if manager:
            queryset = queryset.filter(manager_id=manager)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # PURE JIRA: Complete project privacy
        # - ADMIN does NOT see user projects (only for system administration)
        # - Users ONLY see projects they created OR are members of
        user = self.request.user
        if self.action == 'list':
            queryset = queryset.filter(
                Q(manager=user) | Q(members=user)
            ).distinct()
        
        return queryset
    
    def get_serializer_class(self):
        """Return appropriate serializer"""
        if self.action == 'list':
            return ProjectListSerializer
        elif self.action == 'create':
            return ProjectCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ProjectUpdateSerializer
        elif self.action == 'add_member':
            return AddProjectMemberSerializer
        return ProjectSerializer
    
    def get_permissions(self):
        """
        Pure Jira permissions: 
        - Create: Any authenticated user
        - Modify: Project LEAD only
        - View: Project members only
        - Admin: System administration, cannot access projects unless added
        """
        return [IsAuthenticated(), ProjectPermission()]
    
    def create(self, request, *args, **kwargs):
        """Create a new project"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = serializer.save()
        
        response_serializer = ProjectSerializer(project)
        return Response(
            APIResponse.success(
                data=response_serializer.data,
                message='Project created successfully'
            ),
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """Update a project"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        project = serializer.save()
        
        response_serializer = ProjectSerializer(project)
        return Response(
            APIResponse.success(
                data=response_serializer.data,
                message='Project updated successfully'
            )
        )
    
    def destroy(self, request, *args, **kwargs):
        """Delete a project"""
        instance = self.get_object()
        
        # Check if project has tasks
        if instance.tasks.exists():
            return Response(
                APIResponse.error(
                    message='Cannot delete project with existing tasks',
                    code='project_has_tasks'
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        instance.delete()
        return Response(
            APIResponse.success(message='Project deleted successfully'),
            status=status.HTTP_204_NO_CONTENT
        )
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Get all members of a project"""
        project = self.get_object()
        members = ProjectMember.objects.filter(project=project)
        serializer = ProjectMemberSerializer(members, many=True)
        
        return Response(
            APIResponse.success(
                data=serializer.data,
                message=f'Members of {project.name}'
            )
        )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanManageProjects])
    def add_member(self, request, pk=None):
        """Add a member to the project"""
        project = self.get_object()
        serializer = AddProjectMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_id = serializer.validated_data['user_id']
        role = serializer.validated_data['role']
        
        # Check if user is already a member
        if ProjectMember.objects.filter(project=project, user_id=user_id).exists():
            return Response(
                APIResponse.error(
                    message='User is already a member of this project',
                    code='user_already_member'
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create project member
        member = ProjectMember.objects.create(
            project=project,
            user_id=user_id,
            role=role
        )
        
        response_serializer = ProjectMemberSerializer(member)
        return Response(
            APIResponse.success(
                data=response_serializer.data,
                message='Member added to project successfully'
            ),
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['delete'], url_path='members/(?P<member_id>[^/.]+)',
            permission_classes=[IsAuthenticated, CanManageProjects])
    def remove_member(self, request, pk=None, member_id=None):
        """Remove a member from the project"""
        project = self.get_object()
        
        try:
            member = ProjectMember.objects.get(project=project, user_id=member_id)
            member.delete()
            return Response(
                APIResponse.success(message='Member removed from project successfully'),
                status=status.HTTP_204_NO_CONTENT
            )
        except ProjectMember.DoesNotExist:
            return Response(
                APIResponse.error(
                    message='Member not found in this project',
                    code='member_not_found'
                ),
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        """Get all tasks of a project"""
        project = self.get_object()
        tasks = project.tasks.all()
        
        from apps.tasks.serializers import TaskSerializer
        serializer = TaskSerializer(tasks, many=True)
        
        return Response(
            APIResponse.success(
                data=serializer.data,
                message=f'Tasks in {project.name}'
            )
        )
    
    @action(detail=False, methods=['get'])
    def my_projects(self, request):
        """Get projects where current user is member or manager"""
        user = request.user
        projects = Project.objects.filter(
            Q(manager=user) | Q(members=user)
        ).distinct().annotate(member_count=Count('members'))
        
        serializer = ProjectListSerializer(projects, many=True)
        return Response(
            APIResponse.success(
                data=serializer.data,
                message='Your projects'
            )
        )
    
    @method_decorator(csrf_exempt)
    @action(detail=True, methods=['post'], url_path='invite-members')
    def invite_members(self, request, pk=None):
        """
        Invite members to project via email
        
        POST /api/projects/{id}/invite-members/
        Body: {
            "emails": ["user1@example.com", "user2@example.com"],
            "role": "DEVELOPER",
            "message": "Join our project!"
        }
        """
        project = self.get_object()
        
        # Serialize and validate input
        serializer = InviteMembersSerializer(
            data=request.data,
            context={'project': project}
        )
        serializer.is_valid(raise_exception=True)
        
        emails = serializer.validated_data['emails']
        role = serializer.validated_data['role']
        message = serializer.validated_data.get('message', '')
        
        # Create invitations
        invitations = []
        for email in emails:
            invitation = ProjectInvitation.objects.create(
                project=project,
                invited_by=request.user,
                email=email.lower(),
                role=role,
                message=message
            )
            invitations.append(invitation)
            
            # Send email notification
            self._send_invitation_email(invitation)
        
        # Return created invitations
        invitation_serializer = ProjectInvitationSerializer(invitations, many=True)
        return Response(
            APIResponse.success(
                data=invitation_serializer.data,
                message=f'Successfully invited {len(invitations)} member(s)'
            ),
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'], url_path='invitations')
    def list_invitations(self, request, pk=None):
        """
        List all invitations for a project
        
        GET /api/projects/{id}/invitations/?status=PENDING
        """
        project = self.get_object()
        
        invitation_status = request.query_params.get('status', None)
        invitations = ProjectInvitation.objects.filter(project=project)
        
        if invitation_status:
            invitations = invitations.filter(status=invitation_status.upper())
        
        invitations = invitations.order_by('-created_at')
        serializer = ProjectInvitationSerializer(invitations, many=True)
        
        return Response(
            APIResponse.success(
                data=serializer.data,
                message=f'Invitations for {project.name}'
            )
        )
    
    @method_decorator(csrf_exempt)
    @action(detail=False, methods=['post'], url_path='accept-invitation')
    def accept_invitation(self, request):
        """
        Accept project invitation
        
        POST /api/projects/accept-invitation/
        Body: {"token": "uuid-token-here"}
        """
        serializer = AcceptInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        invitation = ProjectInvitation.objects.get(token=token)
        
        # Check if user exists
        from apps.users.models import User
        user = User.objects.filter(email=invitation.email).first()
        
        if not user:
            return Response(
                APIResponse.error(
                    message='No user account found with this email. Please register first.'
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already a member
        existing_member = ProjectMember.objects.filter(
            project=invitation.project,
            user=user,
            is_active=True
        ).first()
        
        if existing_member:
            invitation.status = 'ACCEPTED'
            invitation.save()
            return Response(
                APIResponse.success(
                    data={'project_id': str(invitation.project.id)},
                    message='You are already a member of this project.'
                )
            )
        
        # Add user as project member
        ProjectMember.objects.create(
            project=invitation.project,
            user=user,
            role=invitation.role,
            is_active=True
        )
        
        # Update invitation status
        from django.utils import timezone
        invitation.status = 'ACCEPTED'
        invitation.accepted_at = timezone.now()
        invitation.save()
        
        return Response(
            APIResponse.success(
                data={
                    'project_id': str(invitation.project.id),
                    'project_name': invitation.project.name,
                    'role': invitation.role
                },
                message=f'Successfully joined {invitation.project.name} as {invitation.role}'
            ),
            status=status.HTTP_200_OK
        )
    
    @method_decorator(csrf_exempt)
    @action(detail=False, methods=['post'], url_path='reject-invitation')
    def reject_invitation(self, request):
        """
        Reject project invitation
        
        POST /api/projects/reject-invitation/
        Body: {"token": "uuid-token-here"}
        """
        serializer = AcceptInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        invitation = ProjectInvitation.objects.get(token=token)
        
        invitation.status = 'REJECTED'
        invitation.save()
        
        return Response(
            APIResponse.success(
                message='Invitation rejected'
            ),
            status=status.HTTP_200_OK
        )
    
    @method_decorator(csrf_exempt)
    @action(detail=True, methods=['post'], url_path='invitations/(?P<invitation_id>[^/.]+)/resend')
    def resend_invitation(self, request, pk=None, invitation_id=None):
        """
        Resend project invitation email
        
        POST /api/projects/{id}/invitations/{invitation_id}/resend/
        """
        project = self.get_object()
        
        try:
            invitation = ProjectInvitation.objects.get(
                id=invitation_id,
                project=project,
                status='PENDING'
            )
            
            # Check if expired and update if needed
            if invitation.is_expired():
                from django.utils import timezone
                from datetime import timedelta
                invitation.expires_at = timezone.now() + timedelta(days=7)
                invitation.save()
            
            # Resend email
            self._send_invitation_email(invitation)
            
            return Response(
                APIResponse.success(
                    message='Invitation resent successfully'
                ),
                status=status.HTTP_200_OK
            )
        except ProjectInvitation.DoesNotExist:
            return Response(
                APIResponse.error(
                    message='Invitation not found or already accepted',
                    code='invitation_not_found'
                ),
                status=status.HTTP_404_NOT_FOUND
            )
    
    @method_decorator(csrf_exempt)
    @action(detail=True, methods=['delete'], url_path='invitations/(?P<invitation_id>[^/.]+)')
    def delete_invitation(self, request, pk=None, invitation_id=None):
        """
        Delete/cancel project invitation
        
        DELETE /api/projects/{id}/invitations/{invitation_id}/
        """
        project = self.get_object()
        
        try:
            invitation = ProjectInvitation.objects.get(
                id=invitation_id,
                project=project
            )
            invitation.delete()
            
            return Response(
                APIResponse.success(
                    message='Invitation deleted successfully'
                ),
                status=status.HTTP_204_NO_CONTENT
            )
        except ProjectInvitation.DoesNotExist:
            return Response(
                APIResponse.error(
                    message='Invitation not found',
                    code='invitation_not_found'
                ),
                status=status.HTTP_404_NOT_FOUND
            )
    
    @method_decorator(csrf_exempt)
    @action(detail=True, methods=['patch'], url_path='invitations/(?P<invitation_id>[^/.]+)')
    def update_invitation(self, request, pk=None, invitation_id=None):
        """
        Update invitation (role or message)
        
        PATCH /api/projects/{id}/invitations/{invitation_id}/
        Body: {"role": "LEAD", "message": "Updated message"}
        """
        project = self.get_object()
        
        try:
            invitation = ProjectInvitation.objects.get(
                id=invitation_id,
                project=project,
                status='PENDING'
            )
            
            # Update allowed fields
            if 'role' in request.data:
                invitation.role = request.data['role']
            if 'message' in request.data:
                invitation.message = request.data['message']
            
            invitation.save()
            
            serializer = ProjectInvitationSerializer(invitation)
            return Response(
                APIResponse.success(
                    data=serializer.data,
                    message='Invitation updated successfully'
                ),
                status=status.HTTP_200_OK
            )
        except ProjectInvitation.DoesNotExist:
            return Response(
                APIResponse.error(
                    message='Invitation not found or already accepted',
                    code='invitation_not_found'
                ),
                status=status.HTTP_404_NOT_FOUND
            )
    
    def _send_invitation_email(self, invitation):
        """Send invitation email to user"""
        from django.core.mail import send_mail
        from django.conf import settings
        from django.template.loader import render_to_string
        
        # Build accept URL
        accept_url = f"{settings.FRONTEND_URL}/accept-invitation?token={invitation.token}"
        
        # Email context
        context = {
            'project_name': invitation.project.name,
            'invited_by': invitation.invited_by.get_full_name(),
            'role': invitation.role,
            'message': invitation.message,
            'accept_url': accept_url,
            'expires_at': invitation.expires_at.strftime('%B %d, %Y'),
        }
        
        # Send email
        subject = f'Invitation to join {invitation.project.name}'
        html_message = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <h2 style="color: #2563eb;">Project Invitation</h2>
                    <p>Hi,</p>
                    <p><strong>{context['invited_by']}</strong> has invited you to join the project:</p>
                    <div style="background-color: white; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
                        <h3 style="margin: 0 0 10px 0;">{context['project_name']}</h3>
                        <p style="margin: 5px 0;"><strong>Role:</strong> {context['role']}</p>
                    </div>
                    {f"<p><em>{context['message']}</em></p>" if context['message'] else ""}
                    <p>Click the button below to accept the invitation:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{context['accept_url']}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a>
                    </div>
                    <p style="color: #666; font-size: 0.9em;">This invitation will expire on {context['expires_at']}.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color: #999; font-size: 0.8em;">If you can't click the button, copy and paste this link into your browser:<br>{context['accept_url']}</p>
                </div>
            </body>
        </html>
        """
        
        plain_message = f"""
        Project Invitation
        
        Hi,
        
        {context['invited_by']} has invited you to join the project: {context['project_name']}
        
        Role: {context['role']}
        {f"Message: {context['message']}" if context['message'] else ""}
        
        Click the link below to accept:
        {context['accept_url']}
        
        This invitation expires on {context['expires_at']}.
        """
        
        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[invitation.email],
                html_message=html_message,
                fail_silently=False,
            )
        except Exception as e:
            # Log error but don't fail the invitation creation
            print(f"Error sending invitation email: {e}")

