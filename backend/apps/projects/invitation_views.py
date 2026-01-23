"""
Project Invitation ViewSet
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.mail import send_mail
from django.conf import settings
from .invitation_models import ProjectInvitation
from .invitation_serializers import (
    ProjectInvitationSerializer,
    InvitationCreateSerializer,
    InvitationAcceptSerializer
)
from .models import Project
from apps.users.models import User


class ProjectInvitationViewSet(viewsets.ModelViewSet):
    """ViewSet for project invitations"""
    queryset = ProjectInvitation.objects.all()
    serializer_class = ProjectInvitationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter invitations based on user role"""
        user = self.request.user
        if user.role in ['ADMIN', 'MANAGER']:
            # Managers can see all invitations they sent
            return ProjectInvitation.objects.filter(invited_by=user)
        return ProjectInvitation.objects.filter(email=user.email)

    @action(detail=False, methods=['post'])
    def send_invitation(self, request):
        """Send project invitation via email"""
        serializer = InvitationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project_id = serializer.validated_data['project']
        email = serializer.validated_data['email']
        role = serializer.validated_data.get('role', 'MEMBER')
        message = serializer.validated_data.get('message', '')

        # Check if user is manager of the project
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify permission (only manager or admin can invite)
        if request.user.role not in ['ADMIN', 'MANAGER']:
            return Response(
                {'error': 'Only managers can send invitations'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if invitation already exists
        existing = ProjectInvitation.objects.filter(
            project=project,
            email=email,
            status='PENDING'
        ).first()

        if existing:
            return Response(
                {'error': 'Invitation already sent to this email'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create invitation
        invitation = ProjectInvitation.objects.create(
            project=project,
            email=email,
            invited_by=request.user,
            role=role,
            message=message
        )

        # Send email
        self._send_invitation_email(invitation)

        return Response(
            ProjectInvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['post'])
    def accept_invitation(self, request):
        """Accept a project invitation"""
        serializer = InvitationAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data['token']

        try:
            invitation = ProjectInvitation.objects.get(token=token)
        except ProjectInvitation.DoesNotExist:
            return Response(
                {'error': 'Invalid invitation token'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if invitation is for the current user
        if invitation.email.lower() != request.user.email.lower():
            return Response(
                {'error': 'This invitation is not for you'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Accept the invitation
        if invitation.accept(request.user):
            return Response({
                'message': 'Invitation accepted successfully',
                'project_id': invitation.project.id,
                'project_name': invitation.project.name
            })
        else:
            return Response(
                {'error': 'Invitation has expired'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def resend(self, request, pk=None):
        """Resend invitation email"""
        invitation = self.get_object()

        if invitation.status != 'PENDING':
            return Response(
                {'error': 'Can only resend pending invitations'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if invitation.is_expired():
            # Update expiration date
            from datetime import timedelta
            from django.utils import timezone
            invitation.expires_at = timezone.now() + timedelta(days=7)
            invitation.save()

        self._send_invitation_email(invitation)

        return Response({'message': 'Invitation resent successfully'})

    def _send_invitation_email(self, invitation):
        """Helper method to send invitation email"""
        try:
            accept_url = f"{settings.FRONTEND_URL}/accept-invitation?token={invitation.token}"
            
            subject = f'Invitation to join project: {invitation.project.name}'
            message = f"""
Hi,

{invitation.invited_by.first_name} {invitation.invited_by.last_name} has invited you to join the project "{invitation.project.name}" on ERMS.

{invitation.message}

To accept this invitation, click the link below:
{accept_url}

This invitation will expire on {invitation.expires_at.strftime('%Y-%m-%d %H:%M')}.

If you don't have an account, you'll be prompted to create one.

Best regards,
ERMS Team
            """

            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [invitation.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"Failed to send invitation email: {e}")
