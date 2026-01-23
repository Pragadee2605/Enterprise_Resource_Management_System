"""
Jira-like User Views with Complete Privacy
Users can only see other users who are in the same projects
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from apps.users.models import User
from apps.users.serializers import UserSerializer
from apps.projects.models import ProjectMember


class JiraUserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    User directory with Jira privacy:
    - Users can ONLY see other users who are in the same projects
    - No global user list
    - Admin can see all users for system administration only
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Return only users who share projects with current user
        """
        user = self.request.user
        
        # Admin sees all users for system administration
        if user.role == 'ADMIN':
            return User.objects.filter(is_active=True)
        
        # Get all projects where current user is a member
        user_projects = ProjectMember.objects.filter(
            user=user,
            is_active=True
        ).values_list('project_id', flat=True)
        
        # Get all users who are members of those same projects
        users_in_same_projects = ProjectMember.objects.filter(
            project_id__in=user_projects,
            is_active=True
        ).values_list('user_id', flat=True).distinct()
        
        # Return those users (excluding current user)
        return User.objects.filter(
            id__in=users_in_same_projects,
            is_active=True
        ).exclude(id=user.id)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Search users by email/name within accessible users
        Used for adding members to projects
        """
        query = request.query_params.get('q', '').strip()
        
        if not query or len(query) < 2:
            return Response({
                'success': False,
                'message': 'Search query must be at least 2 characters',
                'data': []
            })
        
        # Search within accessible users
        queryset = self.get_queryset()
        results = queryset.filter(
            Q(email__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query)
        )[:10]  # Limit to 10 results
        
        serializer = self.get_serializer(results, many=True)
        return Response({
            'success': True,
            'data': serializer.data,
            'message': f'Found {len(serializer.data)} users'
        })
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user profile"""
        serializer = self.get_serializer(request.user)
        return Response({
            'success': True,
            'authenticated': True,
            'data': serializer.data
        })
