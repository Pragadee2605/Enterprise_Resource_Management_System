"""
URL Configuration for Timesheets App
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TimesheetViewSet, TimesheetApprovalViewSet

router = DefaultRouter()
router.register(r'', TimesheetViewSet, basename='timesheet')
router.register(r'approvals', TimesheetApprovalViewSet, basename='timesheet-approval')

urlpatterns = [
    path('', include(router.urls)),
]
