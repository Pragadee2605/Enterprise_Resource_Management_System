"""
Custom OAuth callback views to handle Google authentication.
"""
from django.shortcuts import redirect
from django.contrib.auth import login
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from allauth.socialaccount.models import SocialLogin
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import logging

from .serializers import UserProfileSerializer

logger = logging.getLogger(__name__)


@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])
def google_callback(request):
    """
    Handle Google OAuth callback.
    This view is called after successful Google authentication.
    """
    try:
        # Check if user is authenticated
        if request.user.is_authenticated:
            user = request.user
            logger.info(f"Google OAuth successful for user: {user.email}")
            
            # Create session
            login(request, user, backend='allauth.account.auth_backends.AuthenticationBackend')
            
            # Redirect to frontend dashboard with user info
            return redirect(f'http://localhost:3000/dashboard?oauth=success&email={user.email}')
        else:
            logger.error("Google OAuth callback called but user not authenticated")
            return redirect('http://localhost:3000/login?error=oauth_failed')
            
    except Exception as e:
        logger.error(f"Error in Google OAuth callback: {str(e)}")
        return redirect('http://localhost:3000/login?error=oauth_error')


@api_view(['GET'])
@permission_classes([AllowAny])
def check_oauth_session(request):
    """
    Check if OAuth session is valid and return user data.
    Called by frontend after OAuth redirect.
    """
    if request.user.is_authenticated:
        return Response({
            'success': True,
            'authenticated': True,
            'user': UserProfileSerializer(request.user).data
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'success': False,
            'authenticated': False,
            'message': 'No active session'
        }, status=status.HTTP_401_UNAUTHORIZED)
