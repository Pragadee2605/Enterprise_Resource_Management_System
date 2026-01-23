"""
Service layer for authentication and user management.
"""
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.db.models import Count
from .models import LoginAttempt
import logging

logger = logging.getLogger(__name__)


class AuthService:
    """Service for authentication operations."""
    
    @staticmethod
    def get_client_ip(request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    @staticmethod
    def validate_session(request):
        """Validate user session."""
        if not request.user.is_authenticated:
            return False
        
        if not request.user.is_active:
            return False
        
        return True
    
    @staticmethod
    def clear_user_sessions(user):
        """Clear all sessions for a user (useful for password reset)."""
        from django.contrib.sessions.models import Session
        from django.contrib.auth import get_user_model
        
        # This is a simplified version
        # In production, you'd need to track session-user mapping
        sessions = Session.objects.filter(expire_date__gte=timezone.now())
        for session in sessions:
            session_data = session.get_decoded()
            if session_data.get('_auth_user_id') == str(user.id):
                session.delete()


class RateLimitService:
    """Service for rate limiting operations."""
    
    @staticmethod
    def check_login_rate_limit(email, ip_address, window_minutes=15, max_attempts=5):
        """
        Check if login attempts exceed rate limit.
        
        Args:
            email (str): User email
            ip_address (str): Client IP address
            window_minutes (int): Time window in minutes
            max_attempts (int): Maximum allowed attempts
            
        Returns:
            bool: True if within limit, False if exceeded
        """
        window_start = timezone.now() - timedelta(minutes=window_minutes)
        
        # Check failed attempts by email
        email_attempts = LoginAttempt.objects.filter(
            email=email,
            success=False,
            timestamp__gte=window_start
        ).count()
        
        # Check failed attempts by IP
        ip_attempts = LoginAttempt.objects.filter(
            ip_address=ip_address,
            success=False,
            timestamp__gte=window_start
        ).count()
        
        # Rate limit exceeded if either email or IP has too many attempts
        if email_attempts >= max_attempts or ip_attempts >= max_attempts:
            return False
        
        return True
    
    @staticmethod
    def clear_successful_attempts(email, ip_address):
        """Clear login attempts after successful login."""
        # We keep failed attempts for audit, but could delete older ones
        # This is a design choice - keeping them for security analysis
        pass
    
    @staticmethod
    def get_remaining_attempts(email, ip_address, window_minutes=15, max_attempts=5):
        """Get remaining login attempts before rate limit."""
        window_start = timezone.now() - timedelta(minutes=window_minutes)
        
        email_attempts = LoginAttempt.objects.filter(
            email=email,
            success=False,
            timestamp__gte=window_start
        ).count()
        
        ip_attempts = LoginAttempt.objects.filter(
            ip_address=ip_address,
            success=False,
            timestamp__gte=window_start
        ).count()
        
        email_remaining = max(0, max_attempts - email_attempts)
        ip_remaining = max(0, max_attempts - ip_attempts)
        
        return min(email_remaining, ip_remaining)


class UserService:
    """Service for user management operations."""
    
    @staticmethod
    def get_users_by_role(role):
        """Get all users with a specific role."""
        from .models import User
        return User.objects.filter(role=role, is_active=True)
    
    @staticmethod
    def get_users_by_department(department_id):
        """Get all users in a department."""
        from .models import User
        return User.objects.filter(department_id=department_id, is_active=True)
    
    @staticmethod
    def get_user_stats():
        """Get statistics about users."""
        from .models import User
        
        stats = {
            'total_users': User.objects.filter(is_active=True).count(),
            'by_role': User.objects.filter(is_active=True).values('role').annotate(
                count=Count('id')
            ),
            'inactive_users': User.objects.filter(is_active=False).count(),
        }
        
        return stats
    
    @staticmethod
    def validate_user_permissions(user, required_permissions):
        """
        Validate that user has all required permissions.
        
        Args:
            user: User instance
            required_permissions (list): List of required permission strings
            
        Returns:
            bool: True if user has all permissions
        """
        return all(user.has_permission(perm) for perm in required_permissions)
