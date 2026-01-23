"""
Custom middleware for ERMS
"""
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin


class DisableCSRFMiddleware(MiddlewareMixin):
    """
    Middleware to disable CSRF validation for specific URLs
    """
    def process_request(self, request):
        # Get exempt URLs from settings
        exempt_urls = getattr(settings, 'CSRF_EXEMPT_URLS', [])
        
        # Check if current path should be exempt
        for url in exempt_urls:
            if request.path.startswith(url):
                setattr(request, '_dont_enforce_csrf_checks', True)
                break
        
        return None
