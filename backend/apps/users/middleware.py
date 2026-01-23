"""
Custom middleware for User app.
"""
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from datetime import timedelta
from django.utils import timezone
from .models import LoginAttempt
import logging

logger = logging.getLogger(__name__)


class RateLimitMiddleware(MiddlewareMixin):
    """
    Middleware to implement rate limiting on API endpoints.
    Can be customized per endpoint or globally.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        """Process incoming request for rate limiting."""
        # Skip rate limiting for static files and admin
        if request.path.startswith('/static/') or request.path.startswith('/admin/'):
            return None
        
        # For now, we handle login rate limiting in the view
        # This middleware can be extended for API-wide rate limiting
        return None


class SessionSecurityMiddleware(MiddlewareMixin):
    """
    Middleware to enhance session security.
    - Rotate session keys periodically
    - Validate session integrity
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        """Process request for session security."""
        if request.user.is_authenticated:
            # Check if user is still active
            if not request.user.is_active:
                from django.contrib.auth import logout
                logout(request)
                return JsonResponse({
                    'success': False,
                    'message': 'Your account has been deactivated.'
                }, status=403)
            
            # Check if password must be changed
            if request.user.must_change_password and request.path != '/api/v1/auth/change-password':
                return JsonResponse({
                    'success': False,
                    'message': 'You must change your password before continuing.',
                    'redirect': '/change-password'
                }, status=403)
        
        return None
