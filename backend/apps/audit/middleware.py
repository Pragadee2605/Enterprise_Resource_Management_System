"""
Middleware for Audit Logging
"""
from threading import local

_thread_locals = local()


def get_current_request():
    """Get the current request from thread local storage"""
    return getattr(_thread_locals, 'request', None)


def get_current_user():
    """Get the current user from thread local storage"""
    request = get_current_request()
    if request:
        return getattr(request, 'user', None)
    return None


class AuditMiddleware:
    """Middleware to store request and user in thread local storage"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        _thread_locals.request = request
        response = self.get_response(request)
        return response
    
    def process_view(self, request, view_func, view_args, view_kwargs):
        """Store user in thread local before view processing"""
        if hasattr(request, 'user'):
            _thread_locals.user = request.user
        return None
