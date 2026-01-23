"""
Custom adapters for django-allauth to handle OAuth flow.
"""
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.account.adapter import DefaultAccountAdapter
from django.contrib.auth import login
import logging

logger = logging.getLogger(__name__)


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Custom social account adapter to handle OAuth login.
    """
    
    def pre_social_login(self, request, sociallogin):
        """
        Called just after a user successfully authenticates via a social provider,
        but before the login is actually processed.
        """
        # If the user exists, connect the social account
        if sociallogin.is_existing:
            logger.info(f"Existing user logging in via Google: {sociallogin.user.email}")
            return
        
        # Check if user with this email already exists
        if sociallogin.email_addresses:
            email = sociallogin.email_addresses[0].email
            try:
                from apps.users.models import User
                user = User.objects.get(email=email)
                # Connect this social account to the existing user
                sociallogin.connect(request, user)
                logger.info(f"Connected social account to existing user: {email}")
            except User.DoesNotExist:
                logger.info(f"New user will be created: {email}")
                pass
    
    def populate_user(self, request, sociallogin, data):
        """
        Populate user instance with data from social provider.
        """
        user = super().populate_user(request, sociallogin, data)
        
        # Extract additional data from Google
        if sociallogin.account.provider == 'google':
            # Get first_name and last_name from Google data
            user.first_name = data.get('given_name', '')
            user.last_name = data.get('family_name', '')
            user.email = data.get('email', '')
            
            logger.info(f"Populated user from Google: {user.email} - {user.first_name} {user.last_name}")
        
        return user
    
    def save_user(self, request, sociallogin, form=None):
        """
        Save the user after OAuth signup.
        """
        user = super().save_user(request, sociallogin, form)
        
        # Set default role for new users if not already set
        if not user.role or user.role == '':
            user.role = 'EMPLOYEE'
            
        # Ensure user is active
        user.is_active = True
        user.is_staff = False
        user.save()
        
        logger.info(f"Saved new OAuth user: {user.email} with role {user.role}")
        
        # Automatically log in the user
        login(request, user, backend='allauth.account.auth_backends.AuthenticationBackend')
        
        return user


class CustomAccountAdapter(DefaultAccountAdapter):
    """
    Custom account adapter for additional control.
    """
    
    def is_open_for_signup(self, request):
        """
        Allow signup via OAuth even if regular signup is disabled.
        """
        return True
    
    def get_login_redirect_url(self, request):
        """
        Override redirect after login to go to frontend dashboard.
        """
        if request.user.is_authenticated:
            email = request.user.email
            logger.info(f"Redirecting authenticated user {email} to frontend dashboard")
            return f'http://localhost:3000/login?oauth=success&email={email}'
        return 'http://localhost:3000/login'
    
    def get_email_confirmation_redirect_url(self, request):
        """
        Redirect after email confirmation.
        """
        return 'http://localhost:3000/login?oauth=success'
