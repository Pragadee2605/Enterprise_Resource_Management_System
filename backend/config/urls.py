"""
URL Configuration for ERMS project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import routers

# Create API router
router = routers.DefaultRouter()

urlpatterns = [
    # Admin interface
    path('admin/', admin.site.urls),
    
    # API v1 endpoints
    path('api/v1/', include('apps.users.urls')),  # This includes both /auth/* and /users/*
    path('api/v1/departments/', include('apps.departments.urls')),
    path('api/v1/projects/', include('apps.projects.urls')),
    path('api/v1/tasks/', include('apps.tasks.urls')),
    path('api/v1/timesheets/', include('apps.timesheets.urls')),
    path('api/v1/reports/', include('apps.reports.urls')),
    path('api/v1/audit/', include('apps.audit.urls')),
    
    # Django Allauth (Google OAuth)
    path('accounts/', include('allauth.urls')),
    
    # DRF browsable API (development only)
    path('api-auth/', include('rest_framework.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Customize admin site
admin.site.site_header = "ERMS Administration"
admin.site.site_title = "ERMS Admin Portal"
admin.site.index_title = "Welcome to ERMS Administration"
