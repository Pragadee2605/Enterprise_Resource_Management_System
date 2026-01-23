"""
Views for User authentication and management.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
import logging

from .models import User, LoginAttempt
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    ChangePasswordSerializer, LoginSerializer, UserProfileSerializer
)
from .permissions import IsAdmin
from .services import AuthService, RateLimitService

logger = logging.getLogger(__name__)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Handle user login with rate limiting and audit logging.
    
    POST /api/v1/auth/login
    {
        "email": "user@example.com",
        "password": "password123"
    }
    """
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    email = serializer.validated_data['email']
    password = serializer.validated_data['password']
    ip_address = AuthService.get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    # Check rate limiting
    if not RateLimitService.check_login_rate_limit(email, ip_address):
        logger.warning(f"Rate limit exceeded for {email} from {ip_address}")
        return Response(
            {
                'success': False,
                'message': 'Too many login attempts. Please try again later.'
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )
    
    # Authenticate user
    user = authenticate(request, email=email, password=password)
    
    # Log login attempt
    LoginAttempt.objects.create(
        ip_address=ip_address,
        email=email,
        success=user is not None,
        user_agent=user_agent
    )
    
    if user is not None:
        if not user.is_active:
            logger.warning(f"Inactive user attempted login: {email}")
            return Response(
                {
                    'success': False,
                    'message': 'This account is inactive. Please contact administrator.'
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Login user (create session)
        login(request, user)
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        logger.info(f"User logged in successfully: {email}")
        
        return Response({
            'success': True,
            'message': 'Login successful',
            'data': {
                'user': UserProfileSerializer(user).data,
                'session_id': request.session.session_key
            }
        }, status=status.HTTP_200_OK)
    
    else:
        logger.warning(f"Failed login attempt: {email}")
        return Response(
            {
                'success': False,
                'message': 'Invalid email or password'
            },
            status=status.HTTP_401_UNAUTHORIZED
        )


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    Handle user registration (public endpoint).
    
    POST /api/v1/auth/register
    {
        "email": "user@example.com",
        "password": "password123",
        "password_confirm": "password123",
        "first_name": "John",
        "last_name": "Doe",
        "phone_number": "+1 1234567890"
    }
    """
    serializer = UserCreateSerializer(data=request.data)
    
    try:
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Set default role as EMPLOYEE for self-registered users
        user.role = 'EMPLOYEE'
        user.is_active = True
        user.save()
        
        # Automatically log in the user after registration
        # Specify the backend explicitly since multiple backends are configured
        user.backend = 'django.contrib.auth.backends.ModelBackend'
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        
        logger.info(f"New user registered: {user.email}")
        
        return Response({
            'success': True,
            'message': 'Registration successful! You are now logged in.',
            'data': {
                'user': UserProfileSerializer(user).data,
                'session_id': request.session.session_key
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return Response({
            'success': False,
            'message': 'Registration failed',
            'errors': serializer.errors if hasattr(serializer, 'errors') else {'detail': str(e)}
        }, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Handle user logout.
    
    POST /api/v1/auth/logout
    """
    user_email = request.user.email
    logout(request)
    logger.info(f"User logged out: {user_email}")
    
    return Response({
        'success': True,
        'message': 'Logout successful'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def current_user_view(request):
    """
    Get current authenticated user's profile.
    
    GET /api/v1/auth/me
    """
    if not request.user.is_authenticated:
        return Response({
            'success': False,
            'authenticated': False,
            'message': 'Not authenticated'
        }, status=status.HTTP_200_OK)
    
    serializer = UserProfileSerializer(request.user)
    return Response({
        'success': True,
        'authenticated': True,
        'data': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """
    Change current user's password.
    
    POST /api/v1/auth/change-password
    {
        "old_password": "oldpass123",
        "new_password": "newpass123",
        "new_password_confirm": "newpass123"
    }
    """
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    user = request.user
    
    # Check old password
    if not user.check_password(serializer.validated_data['old_password']):
        return Response({
            'success': False,
            'message': 'Current password is incorrect'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    """
    Update current user's profile information.
    
    PUT/PATCH /api/v1/auth/profile
    {
        "first_name": "John",
        "last_name": "Doe",
        "phone_number": "1234567890",
        "role": "EMPLOYEE"  // Only for first-time setup
    }
    """
    user = request.user
    data = request.data.copy()
    
    # Allow role update only if user doesn't have a role set (first-time OAuth users)
    if 'role' in data:
        if user.role and user.role != '':
            # User already has a role, don't allow change
            data.pop('role')
        else:
            # First-time setup, only EMPLOYEE role allowed
            allowed_roles = ['EMPLOYEE']
            if data.get('role') and data['role'] not in allowed_roles:
                return Response({
                    'success': False,
                    'message': 'New users can only be assigned EMPLOYEE role'
                }, status=status.HTTP_400_BAD_REQUEST)
            # Set default role
            data['role'] = 'EMPLOYEE'
    
    # Update allowed fields
    user.first_name = data.get('first_name', user.first_name)
    user.last_name = data.get('last_name', user.last_name)
    user.phone_number = data.get('phone_number', user.phone_number)
    
    if 'role' in data and (not user.role or user.role == ''):
        user.role = data['role']
    
    try:
        user.save()
        logger.info(f"Profile updated for user: {user.email}")
        
        return Response({
            'success': True,
            'message': 'Profile updated successfully',
            'data': UserProfileSerializer(user).data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error updating profile for {user.email}: {str(e)}")
        return Response({
            'success': False,
            'message': 'Error updating profile'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Handle user logout.
    
    POST /api/v1/auth/logout
    """
    email = request.user.email
    logout(request)
    
    logger.info(f"User logged out: {email}")
    
    return Response({
        'success': True,
        'message': 'Logout successful'
    }, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for User CRUD operations.
    - List/Retrieve: Admin only
    - Create/Update/Delete: Admin only
    """
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """Set permissions based on action."""
        if self.action == 'my_invitations':
            # Any authenticated user can see their own invitations
            return [IsAuthenticated()]
        elif self.action in ['list', 'retrieve']:
            # Admins can view users
            return [IsAuthenticated(), IsAdmin()]
        else:
            # Only Admins can create/update/delete
            return [IsAuthenticated(), IsAdmin()]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer
    
    def get_queryset(self):
        """Filter queryset with search and filters."""
        queryset = User.objects.select_related('department').all()
        
        # Search
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(employee_id__icontains=search)
            )
        
        # Filters
        role = self.request.query_params.get('role', None)
        if role:
            queryset = queryset.filter(role=role)
        
        department = self.request.query_params.get('department', None)
        if department:
            queryset = queryset.filter(department_id=department)
        
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create new user with proper response format."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        logger.info(f"User created: {user.email} by {request.user.email}")
        
        return Response({
            'success': True,
            'message': 'User created successfully',
            'data': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update user with proper response format."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        logger.info(f"User updated: {user.email} by {request.user.email}")
        
        return Response({
            'success': True,
            'message': 'User updated successfully',
            'data': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete user (deactivate instead of delete)."""
        instance = self.get_object()
        
        # Prevent self-deletion
        if instance.id == request.user.id:
            return Response(
                {
                    'success': False,
                    'message': 'You cannot delete your own account'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        instance.is_active = False
        instance.save()
        
        logger.info(f"User deactivated: {instance.email} by {request.user.email}")
        
        return Response({
            'success': True,
            'message': 'User deactivated successfully'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a user (soft delete)."""
        user = self.get_object()
        
        # Prevent self-deactivation
        if user.id == request.user.id:
            return Response(
                {
                    'success': False,
                    'message': 'You cannot deactivate your own account'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_active = False
        user.save()
        
        logger.info(f"User deactivated: {user.email} by {request.user.email}")
        
        return Response({
            'success': True,
            'message': 'User deactivated successfully',
            'data': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a deactivated user."""
        user = self.get_object()
        user.is_active = True
        user.save()
        
        logger.info(f"User activated: {user.email} by {request.user.email}")
        
        return Response({
            'success': True,
            'message': 'User activated successfully',
            'data': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Reset user password (admin only)."""
        user = self.get_object()
        
        # Generate temporary password
        temp_password = User.objects.make_random_password(length=12)
        user.set_password(temp_password)
        user.must_change_password = True
        user.save()
        
        logger.info(f"Password reset for user: {user.email} by {request.user.email}")
        
        # In production, send email with temp password
        return Response({
            'success': True,
            'message': 'Password reset successfully',
            'data': {
                'temporary_password': temp_password,
                'note': 'User must change password on next login'
            }
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='my-invitations')
    def my_invitations(self, request):
        """Get current user's pending project invitations"""
        from apps.projects.models import ProjectInvitation
        from apps.projects.serializers import ProjectInvitationSerializer
        from apps.core.exceptions import APIResponse
        
        user_email = request.user.email
        invitations = ProjectInvitation.objects.filter(
            email__iexact=user_email,
            status='PENDING'
        ).select_related('project', 'invited_by').order_by('-created_at')
        
        # Filter out expired invitations
        active_invitations = [inv for inv in invitations if not inv.is_expired()]
        
        serializer = ProjectInvitationSerializer(active_invitations, many=True)
        
        return Response(
            APIResponse.success(
                data=serializer.data,
                message=f'You have {len(active_invitations)} pending invitation(s)'
            )
        )
