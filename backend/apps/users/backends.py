"""
Custom authentication backend for ERMS.
"""
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()


class EmailBackend(ModelBackend):
    """
    Custom authentication backend that allows users to log in using email.
    """
    
    def authenticate(self, request, username=None, password=None, email=None, **kwargs):
        """
        Authenticate user with email and password.
        
        Args:
            request: HTTP request object
            username: Legacy parameter (not used)
            password: User password
            email: User email address
            **kwargs: Additional parameters
            
        Returns:
            User instance if authentication successful, None otherwise
        """
        # Support both 'email' and 'username' parameters
        email = email or username or kwargs.get('email')
        
        if email is None or password is None:
            return None
        
        try:
            # Find user by email (case-insensitive)
            user = User.objects.get(email__iexact=email)
            
            # Check password
            if user.check_password(password):
                return user
            
        except User.DoesNotExist:
            # Run the default password hasher to reduce timing difference
            User().set_password(password)
            return None
        
        return None
    
    def get_user(self, user_id):
        """
        Get user by ID.
        
        Args:
            user_id: User ID
            
        Returns:
            User instance or None
        """
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
