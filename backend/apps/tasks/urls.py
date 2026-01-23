"""
Task URL Configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.tasks.views import (
    TaskViewSet,
    IssueTypeViewSet,
    SprintViewSet,
    TaskAttachmentViewSet,
    TaskCommentViewSet,
    TaskWatcherViewSet,
    TaskHistoryViewSet
)

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'issue-types', IssueTypeViewSet, basename='issuetype')
router.register(r'sprints', SprintViewSet, basename='sprint')
router.register(r'attachments', TaskAttachmentViewSet, basename='attachment')
router.register(r'comments', TaskCommentViewSet, basename='comment')
router.register(r'watchers', TaskWatcherViewSet, basename='watcher')
router.register(r'history', TaskHistoryViewSet, basename='history')

urlpatterns = [
    path('', include(router.urls)),
]
