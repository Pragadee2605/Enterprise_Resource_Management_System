"""
Task Views
"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q, Count
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated

from apps.tasks.models import (
    Task, IssueType, Sprint, TaskAttachment,
    TaskComment, TaskWatcher, TaskHistory, Label
)
from apps.tasks.serializers import (
    TaskSerializer,
    TaskListSerializer,
    TaskCreateSerializer,
    TaskUpdateSerializer,
    UpdateTaskStatusSerializer,
    UpdateTaskHoursSerializer,
    IssueTypeSerializer,
    SprintSerializer,
    TaskAttachmentSerializer,
    TaskCommentSerializer,
    TaskWatcherSerializer,
    TaskHistorySerializer,
)
from apps.users.permissions import CanManageProjects
from apps.core.exceptions import APIResponse


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Task management
    
    Permissions:
    - List/Retrieve: Authenticated users (filtered by access)
    - Create/Update/Delete: Admin or Manager with CanManageProjects
    """
    queryset = Task.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['title', 'priority', 'status', 'due_date', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter queryset based on user permissions"""
        queryset = super().get_queryset()
        queryset = queryset.select_related(
            'project', 'assigned_to', 'created_by', 'issue_type', 'sprint', 'parent_epic'
        ).prefetch_related('labels', 'watchers')
        
        user = self.request.user
        
        # Filter by project (required)
        project = self.request.query_params.get('project')
        if project:
            queryset = queryset.filter(project_id=project)
        
        # Filter by assigned user (support 'me' keyword)
        assigned_to = self.request.query_params.get('assigned_to')
        if assigned_to:
            if assigned_to.lower() == 'me':
                queryset = queryset.filter(assigned_to=user)
            elif assigned_to.lower() == 'unassigned':
                queryset = queryset.filter(assigned_to__isnull=True)
            else:
                queryset = queryset.filter(assigned_to_id=assigned_to)
        
        # Filter by status (supports multiple via comma)
        status_param = self.request.query_params.get('status')
        if status_param:
            status_list = [s.strip().upper() for s in status_param.split(',')]
            queryset = queryset.filter(status__in=status_list)
        
        # Filter by priority (supports multiple via comma)
        priority = self.request.query_params.get('priority')
        if priority:
            priority_list = [p.strip().upper() for p in priority.split(',')]
            queryset = queryset.filter(priority__in=priority_list)
        
        # Filter by sprint
        sprint = self.request.query_params.get('sprint')
        if sprint:
            if sprint.lower() == 'none':
                queryset = queryset.filter(sprint__isnull=True)
            else:
                queryset = queryset.filter(sprint_id=sprint)
        
        # Filter by epic
        epic = self.request.query_params.get('epic')
        if epic:
            if epic.lower() == 'none':
                queryset = queryset.filter(parent_epic__isnull=True)
            else:
                queryset = queryset.filter(parent_epic_id=epic)
        
        # Filter by issue type
        issue_type = self.request.query_params.get('type')
        if issue_type:
            queryset = queryset.filter(issue_type__name=issue_type.upper())
        
        # Filter by labels (supports multiple via comma)
        labels = self.request.query_params.get('labels')
        if labels:
            label_list = [l.strip() for l in labels.split(',')]
            for label_id in label_list:
                queryset = queryset.filter(labels__id=label_id)
        
        # Filter by due date range
        due_date_from = self.request.query_params.get('due_date_from')
        if due_date_from:
            queryset = queryset.filter(due_date__gte=due_date_from)
        
        due_date_to = self.request.query_params.get('due_date_to')
        if due_date_to:
            queryset = queryset.filter(due_date__lte=due_date_to)
        
        # Filter by story points range
        story_points_min = self.request.query_params.get('story_points_min')
        if story_points_min:
            queryset = queryset.filter(story_points__gte=story_points_min)
        
        story_points_max = self.request.query_params.get('story_points_max')
        if story_points_max:
            queryset = queryset.filter(story_points__lte=story_points_max)
        
        # Search in title and description
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search)
            )
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter overdue tasks
        overdue = self.request.query_params.get('overdue')
        if overdue and overdue.lower() == 'true':
            queryset = queryset.filter(
                due_date__lt=timezone.now().date(),
                status__in=['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED']
            )
        
        # Filter tasks for current user if not admin
        if not user.is_admin and self.action == 'list':
            queryset = queryset.filter(
                Q(assigned_to=user) | 
                Q(created_by=user) | 
                Q(project__manager=user) |
                Q(project__members=user)
            ).distinct()
        
        return queryset
    
    def get_serializer_class(self):
        """Return appropriate serializer"""
        if self.action == 'list':
            return TaskListSerializer
        elif self.action == 'create':
            return TaskCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TaskUpdateSerializer
        elif self.action == 'update_status':
            return UpdateTaskStatusSerializer
        elif self.action == 'update_hours':
            return UpdateTaskHoursSerializer
        return TaskSerializer
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'destroy']:
            return [IsAuthenticated(), CanManageProjects()]
        elif self.action in ['update', 'partial_update', 'update_status']:
            # Allow assigned user or managers to update
            return [IsAuthenticated()]
        return [IsAuthenticated()]
    
    def create(self, request, *args, **kwargs):
        """Create a new task"""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        task = serializer.save()
        
        response_serializer = TaskSerializer(task)
        return Response(
            APIResponse.success(
                data=response_serializer.data,
                message='Task created successfully'
            ),
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """Update a task"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Check permission: assigned user or project manager or admin
        user = request.user
        if not (user.is_admin or 
                user == instance.assigned_to or 
                user == instance.project.manager or 
                user.is_manager):
            return Response(
                APIResponse.error(
                    message='You do not have permission to update this task',
                    code='permission_denied'
                ),
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        task = serializer.save()
        
        response_serializer = TaskSerializer(task)
        return Response(
            APIResponse.success(
                data=response_serializer.data,
                message='Task updated successfully'
            )
        )
    
    def destroy(self, request, *args, **kwargs):
        """Delete a task"""
        instance = self.get_object()
        instance.delete()
        return Response(
            APIResponse.success(message='Task deleted successfully'),
            status=status.HTTP_204_NO_CONTENT
        )
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update task status"""
        task = self.get_object()
        serializer = UpdateTaskStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        new_status = serializer.validated_data['status']
        task.status = new_status
        
        # Auto-set completed_date if status is COMPLETED
        if new_status == 'COMPLETED' and not task.completed_date:
            task.completed_date = timezone.now()
        elif new_status != 'COMPLETED':
            task.completed_date = None
        
        task.save()
        
        response_serializer = TaskSerializer(task)
        return Response(
            APIResponse.success(
                data=response_serializer.data,
                message='Task status updated successfully'
            )
        )
    
    @action(detail=True, methods=['post'])
    def update_hours(self, request, pk=None):
        """Update actual hours worked on task"""
        task = self.get_object()
        
        # Only assigned user or managers can update hours
        user = request.user
        if not (user == task.assigned_to or user.is_admin or user.is_manager):
            return Response(
                APIResponse.error(
                    message='You do not have permission to update hours for this task',
                    code='permission_denied'
                ),
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = UpdateTaskHoursSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        task.actual_hours = serializer.validated_data['actual_hours']
        task.save()
        
        response_serializer = TaskSerializer(task)
        return Response(
            APIResponse.success(
                data=response_serializer.data,
                message='Task hours updated successfully'
            )
        )
    
    @action(detail=False, methods=['get'])
    def my_tasks(self, request):
        """Get tasks assigned to current user"""
        user = request.user
        tasks = Task.objects.filter(assigned_to=user)
        
        # Apply status filter if provided
        status_param = request.query_params.get('status')
        if status_param:
            tasks = tasks.filter(status=status_param.upper())
        
        serializer = TaskListSerializer(tasks, many=True)
        return Response(
            APIResponse.success(
                data=serializer.data,
                message='Your tasks'
            )
        )
    
    @action(detail=True, methods=['post'])
    def watch(self, request, pk=None):
        """Add current user as watcher to this task"""
        task = self.get_object()
        
        watcher, created = TaskWatcher.objects.get_or_create(
            task=task,
            user=request.user
        )
        
        return Response(
            APIResponse.success(
                data={'is_watching': True},
                message='You are now watching this task'
            ),
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def unwatch(self, request, pk=None):
        """Remove current user as watcher from this task"""
        task = self.get_object()
        
        TaskWatcher.objects.filter(
            task=task,
            user=request.user
        ).delete()
        
        return Response(
            APIResponse.success(
                data={'is_watching': False},
                message='You have stopped watching this task'
            )
        )
    
    @action(detail=True, methods=['get'])
    def is_watching(self, request, pk=None):
        """Check if current user is watching this task"""
        task = self.get_object()
        
        is_watching = TaskWatcher.objects.filter(
            task=task,
            user=request.user
        ).exists()
        
        return Response(
            APIResponse.success(
                data={'is_watching': is_watching}
            )
        )
    
    @action(detail=True, methods=['get'])
    def project_members(self, request, pk=None):
        """Get all members of the task's project for assignment"""
        task = self.get_object()
        project = task.project
        
        from apps.projects.models import ProjectMember
        from apps.users.serializers import UserSerializer
        
        # Get all active project members
        members = ProjectMember.objects.filter(
            project=project,
            is_active=True
        ).select_related('user')
        
        users = [member.user for member in members]
        serializer = UserSerializer(users, many=True)
        
        return Response(
            APIResponse.success(
                data=serializer.data,
                message=f'Project members for {project.name}'
            )
        )
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Assign task to a user"""
        task = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                APIResponse.error(
                    message='user_id is required',
                    code='missing_field'
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from apps.users.models import User
        from apps.projects.models import ProjectMember
        
        # Check if user exists
        try:
            assignee = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                APIResponse.error(
                    message='User not found',
                    code='user_not_found'
                ),
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is a member of the project
        if not ProjectMember.objects.filter(
            project=task.project,
            user=assignee,
            is_active=True
        ).exists():
            return Response(
                APIResponse.error(
                    message='User is not a member of this project',
                    code='not_project_member'
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Assign task
        task.assigned_to = assignee
        task.save()
        
        response_serializer = TaskSerializer(task)
        return Response(
            APIResponse.success(
                data=response_serializer.data,
                message=f'Task assigned to {assignee.get_full_name()}'
            )
        )
    
    @action(detail=True, methods=['post'])
    def assign_to_me(self, request, pk=None):
        """Assign task to current user"""
        task = self.get_object()
        
        from apps.projects.models import ProjectMember
        
        # Check if current user is a member of the project
        if not ProjectMember.objects.filter(
            project=task.project,
            user=request.user,
            is_active=True
        ).exists():
            return Response(
                APIResponse.error(
                    message='You are not a member of this project',
                    code='not_project_member'
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Assign task to current user
        task.assigned_to = request.user
        task.save()
        
        response_serializer = TaskSerializer(task)
        return Response(
            APIResponse.success(
                data=response_serializer.data,
                message='Task assigned to you'
            )
        )
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue tasks"""
        user = request.user
        
        tasks = Task.objects.filter(
            due_date__lt=timezone.now().date(),
            status__in=['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED']
        )
        
        # Filter by user access if not admin
        if not user.is_admin:
            tasks = tasks.filter(
                Q(assigned_to=user) | 
                Q(project__manager=user) |
                Q(project__members=user)
            ).distinct()
        
        serializer = TaskListSerializer(tasks, many=True)
        return Response(
            APIResponse.success(
                data=serializer.data,
                message='Overdue tasks'
            )
        )
    
    @action(detail=False, methods=['get'])
    def kanban(self, request):
        """Get tasks organized by status for Kanban board"""
        project = request.query_params.get('project')
        sprint = request.query_params.get('sprint')
        
        if not project:
            return Response(
                APIResponse.error(
                    message='Project ID is required',
                    code='missing_field'
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tasks = Task.objects.filter(project_id=project).select_related(
            'assigned_to', 'issue_type', 'sprint'
        ).order_by('kanban_order', '-created_at')
        
        if sprint:
            tasks = tasks.filter(sprint_id=sprint)
        
        # Group by status
        kanban_data = {}
        for status_choice in Task.STATUS_CHOICES:
            status_key = status_choice[0]
            kanban_data[status_key] = []
        
        for task in tasks:
            task_data = TaskSerializer(task).data
            kanban_data[task.status].append(task_data)
        
        return Response(
            APIResponse.success(
                data=kanban_data,
                message='Kanban board data'
            )
        )
    
    @action(detail=False, methods=['get'])
    def filters_meta(self, request):
        """Get filter metadata (dropdown options) for a project"""
        project_id = request.query_params.get('project')
        
        if not project_id:
            return Response(
                APIResponse.error(
                    message='Project ID is required',
                    code='missing_field'
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from apps.users.models import User
        from apps.projects.models import Project, ProjectMember
        from apps.tasks.models import Label
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                APIResponse.error(
                    message='Project not found',
                    code='project_not_found'
                ),
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get project members (potential assignees)
        project_members = ProjectMember.objects.filter(
            project=project,
            is_active=True
        ).select_related('user').values(
            'user__id',
            'user__first_name',
            'user__last_name',
            'user__email'
        )
        
        assignees = [
            {
                'id': str(member['user__id']),
                'name': f"{member['user__first_name']} {member['user__last_name']}".strip() or member['user__email'],
                'email': member['user__email']
            }
            for member in project_members
        ]
        
        # Get epics (tasks with issue_type = EPIC)
        epics = Task.objects.filter(
            project=project,
            issue_type__name='EPIC',
            is_active=True
        ).values('id', 'title')
        
        epic_list = [
            {'id': str(epic['id']), 'name': epic['title']}
            for epic in epics
        ]
        
        # Get issue types
        issue_types = IssueType.objects.filter(is_active=True).values('name', 'icon', 'color')
        type_list = [
            {
                'value': it['name'],
                'label': it['name'].replace('_', ' ').title(),
                'icon': it['icon'],
                'color': it['color']
            }
            for it in issue_types
        ]
        
        # Get labels for this project
        labels = Label.objects.filter(
            project=project,
            is_active=True
        ).values('id', 'name', 'color')
        
        label_list = [
            {
                'id': str(label['id']),
                'name': label['name'],
                'color': label['color']
            }
            for label in labels
        ]
        
        # Get sprints for this project
        sprints = Sprint.objects.filter(
            project=project,
            is_active=True
        ).values('id', 'name', 'status')
        
        sprint_list = [
            {
                'id': str(sprint['id']),
                'name': sprint['name'],
                'status': sprint['status']
            }
            for sprint in sprints
        ]
        
        # Status options
        status_options = [
            {'value': choice[0], 'label': choice[1]}
            for choice in Task.STATUS_CHOICES
        ]
        
        # Priority options
        priority_options = [
            {'value': choice[0], 'label': choice[1]}
            for choice in Task.PRIORITY_CHOICES
        ]
        
        meta_data = {
            'assignees': assignees,
            'epics': epic_list,
            'types': type_list,
            'labels': label_list,
            'sprints': sprint_list,
            'statuses': status_options,
            'priorities': priority_options,
        }
        
        return Response(
            APIResponse.success(
                data=meta_data,
                message='Filter metadata'
            )
        )
    
    @action(detail=True, methods=['post'])
    def reorder(self, request, pk=None):
        """Reorder task in Kanban board"""
        task = self.get_object()
        new_order = request.data.get('kanban_order')
        new_status = request.data.get('status')
        
        if new_order is not None:
            task.kanban_order = new_order
        
        if new_status:
            task.status = new_status
            
            # Auto-set completed_date if status is DONE
            if new_status == 'DONE' and not task.completed_date:
                task.completed_date = timezone.now()
            elif new_status != 'DONE':
                task.completed_date = None
        
        task.save()
        
        serializer = TaskSerializer(task)
        return Response(
            APIResponse.success(
                data=serializer.data,
                message='Task reordered successfully'
            )
        )


# ViewSets for Advanced Features

class IssueTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for IssueType - Read Only"""
    queryset = IssueType.objects.all()
    serializer_class = IssueTypeSerializer
    permission_classes = [IsAuthenticated]


class SprintViewSet(viewsets.ModelViewSet):
    """ViewSet for Sprint management"""
    queryset = Sprint.objects.all()
    serializer_class = SprintSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['start_date', 'end_date', 'status']
    ordering = ['-start_date']
    
    def get_queryset(self):
        """Filter sprints by project"""
        queryset = super().get_queryset()
        queryset = queryset.select_related('project', 'created_by')
        
        # Filter by project
        project = self.request.query_params.get('project')
        if project:
            queryset = queryset.filter(project_id=project)
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param.upper())
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def start_sprint(self, request, pk=None):
        """Start a sprint"""
        sprint = self.get_object()
        
        if sprint.status != 'PLANNED':
            return Response(
                APIResponse.error(
                    message='Only planned sprints can be started',
                    code='invalid_status'
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        sprint.status = 'ACTIVE'
        sprint.save()
        
        serializer = self.get_serializer(sprint)
        return Response(
            APIResponse.success(
                data=serializer.data,
                message='Sprint started successfully'
            )
        )
    
    @action(detail=True, methods=['post'])
    def complete_sprint(self, request, pk=None):
        """Complete a sprint"""
        sprint = self.get_object()
        
        if sprint.status != 'ACTIVE':
            return Response(
                APIResponse.error(
                    message='Only active sprints can be completed',
                    code='invalid_status'
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        sprint.status = 'COMPLETED'
        sprint.save()
        
        serializer = self.get_serializer(sprint)
        return Response(
            APIResponse.success(
                data=serializer.data,
                message='Sprint completed successfully'
            )
        )
    
    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        """Get all tasks in this sprint"""
        sprint = self.get_object()
        tasks = Task.objects.filter(sprint=sprint).select_related(
            'assigned_to', 'created_by', 'issue_type'
        )
        
        serializer = TaskSerializer(tasks, many=True)
        return Response(
            APIResponse.success(
                data=serializer.data,
                message='Sprint tasks'
            )
        )
    
    @action(detail=True, methods=['get'])
    def burndown(self, request, pk=None):
        """Get burn-down chart data for sprint"""
        sprint = self.get_object()
        
        # Calculate total story points
        total_points = sprint.tasks.aggregate(
            total=Count('story_points')
        )['total'] or 0
        
        # Get completed story points per day
        # This is a simplified version - you'd want to track this over time
        completed_points = sprint.tasks.filter(
            status='DONE'
        ).aggregate(
            total=Count('story_points')
        )['total'] or 0
        
        remaining_points = total_points - completed_points
        
        data = {
            'total_points': total_points,
            'completed_points': completed_points,
            'remaining_points': remaining_points,
            'sprint_days': sprint.duration_days,
            # Add historical data here for actual burn-down chart
        }
        
        return Response(
            APIResponse.success(
                data=data,
                message='Burn-down chart data'
            )
        )


class TaskAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet for TaskAttachment"""
    queryset = TaskAttachment.objects.all()
    serializer_class = TaskAttachmentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        """Filter attachments by task"""
        queryset = super().get_queryset()
        
        # Filter by task
        task = self.request.query_params.get('task')
        if task:
            queryset = queryset.filter(task_id=task)
        
        return queryset


class TaskCommentViewSet(viewsets.ModelViewSet):
    """ViewSet for TaskComment"""
    queryset = TaskComment.objects.all()
    serializer_class = TaskCommentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter comments by task"""
        queryset = super().get_queryset()
        queryset = queryset.select_related('author', 'task').prefetch_related('mentions')
        
        # Filter by task
        task = self.request.query_params.get('task')
        if task:
            queryset = queryset.filter(task_id=task)
        
        # Exclude replies (get only top-level comments)
        if self.request.query_params.get('top_level_only') == 'true':
            queryset = queryset.filter(parent_comment__isnull=True)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['get'])
    def replies(self, request, pk=None):
        """Get all replies to a comment"""
        comment = self.get_object()
        replies = TaskComment.objects.filter(parent_comment=comment).select_related('author')
        
        serializer = self.get_serializer(replies, many=True)
        return Response(
            APIResponse.success(
                data=serializer.data,
                message='Comment replies'
            )
        )


class TaskWatcherViewSet(viewsets.ModelViewSet):
    """ViewSet for TaskWatcher"""
    queryset = TaskWatcher.objects.all()
    serializer_class = TaskWatcherSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter watchers by task or user"""
        queryset = super().get_queryset()
        
        # Filter by task
        task = self.request.query_params.get('task')
        if task:
            queryset = queryset.filter(task_id=task)
        
        # Filter by user
        user = self.request.query_params.get('user')
        if user:
            queryset = queryset.filter(user_id=user)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def watch(self, request):
        """Add current user as watcher to a task"""
        task_id = request.data.get('task')
        
        if not task_id:
            return Response(
                APIResponse.error(
                    message='Task ID is required',
                    code='missing_field'
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        watcher, created = TaskWatcher.objects.get_or_create(
            task_id=task_id,
            user=request.user
        )
        
        serializer = self.get_serializer(watcher)
        return Response(
            APIResponse.success(
                data=serializer.data,
                message='You are now watching this task'
            ),
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'])
    def unwatch(self, request):
        """Remove current user as watcher from a task"""
        task_id = request.data.get('task')
        
        if not task_id:
            return Response(
                APIResponse.error(
                    message='Task ID is required',
                    code='missing_field'
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        TaskWatcher.objects.filter(
            task_id=task_id,
            user=request.user
        ).delete()
        
        return Response(
            APIResponse.success(
                message='You have stopped watching this task'
            )
        )


class TaskHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for TaskHistory - Read Only"""
    queryset = TaskHistory.objects.all()
    serializer_class = TaskHistorySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter history by task"""
        queryset = super().get_queryset()
        queryset = queryset.select_related('task', 'user')
        
        # Filter by task
        task = self.request.query_params.get('task')
        if task:
            queryset = queryset.filter(task_id=task)
        
        return queryset.order_by('-created_at')
