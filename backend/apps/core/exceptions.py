"""
Custom exception handlers and responses.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler for DRF that formats all error responses consistently.
    
    Returns responses in format:
    {
        "success": false,
        "message": "Error message",
        "errors": {...},
        "timestamp": "2025-12-22T10:30:00Z"
    }
    """
    # Call DRF's default exception handler first
    response = exception_handler(exc, context)
    
    if response is not None:
        # Log the error
        view = context.get('view', None)
        request = context.get('request', None)
        
        logger.error(
            f"API Error: {exc.__class__.__name__} - {str(exc)} "
            f"- View: {view.__class__.__name__ if view else 'Unknown'} "
            f"- User: {request.user if request and request.user.is_authenticated else 'Anonymous'}"
        )
        
        # Customize response format
        custom_response = {
            'success': False,
            'message': get_error_message(exc, response),
            'errors': response.data if isinstance(response.data, dict) else {'detail': response.data},
        }
        
        response.data = custom_response
    
    return response


def get_error_message(exc, response):
    """Extract appropriate error message from exception."""
    if hasattr(exc, 'detail'):
        if isinstance(exc.detail, dict):
            # Get first error message from dict
            first_key = list(exc.detail.keys())[0]
            first_error = exc.detail[first_key]
            if isinstance(first_error, list):
                return str(first_error[0])
            return str(first_error)
        return str(exc.detail)
    return str(exc)


class APIResponse:
    """Helper class for consistent API responses."""
    
    @staticmethod
    def success(data=None, message="Success", status_code=status.HTTP_200_OK):
        """Return success response dict."""
        return {
            'success': True,
            'message': message,
            'data': data
        }
    
    @staticmethod
    def error(message="Error occurred", errors=None, code=None):
        """Return error response dict."""
        response = {
            'success': False,
            'message': message,
        }
        if errors:
            response['errors'] = errors
        if code:
            response['code'] = code
        return response
    
    @staticmethod
    def no_content(message="Operation successful"):
        """Return no content response."""
        return Response({
            'success': True,
            'message': message
        }, status=status.HTTP_204_NO_CONTENT)
    
    @staticmethod
    def not_found(message="Resource not found"):
        """Return not found response."""
        return APIResponse.error(message, status_code=status.HTTP_404_NOT_FOUND)
    
    @staticmethod
    def unauthorized(message="Unauthorized"):
        """Return unauthorized response."""
        return APIResponse.error(message, status_code=status.HTTP_401_UNAUTHORIZED)
    
    @staticmethod
    def forbidden(message="Forbidden"):
        """Return forbidden response."""
        return APIResponse.error(message, status_code=status.HTTP_403_FORBIDDEN)
