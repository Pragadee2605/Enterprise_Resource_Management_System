"""
URL configuration for Users app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import oauth_views

# Create router for ViewSets
router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')

urlpatterns = [
    # Authentication endpoints (under /api/v1/auth/)
    path('auth/register', views.register_view, name='register'),
    path('auth/login', views.login_view, name='login'),
    path('auth/logout', views.logout_view, name='logout'),
    path('auth/me', views.current_user_view, name='current-user'),
    path('auth/profile', views.update_profile_view, name='update-profile'),
    path('auth/change-password', views.change_password_view, name='change-password'),
    
    # OAuth endpoints
    path('auth/oauth/google/callback', oauth_views.google_callback, name='google-callback'),
    path('auth/oauth/check-session', oauth_views.check_oauth_session, name='check-oauth-session'),
    
    # User management endpoints (via router - under /api/v1/users/)
    path('', include(router.urls)),
]
