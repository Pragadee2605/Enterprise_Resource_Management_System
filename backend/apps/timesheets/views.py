"""
Views for Timesheets App
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone

from .models import Timesheet, TimesheetApproval
from .serializers import (
    TimesheetSerializer,
    TimesheetCreateSerializer,
    TimesheetUpdateSerializer,
    TimesheetApprovalSerializer,
    TimesheetApproveSerializer
)
from apps.users.permissions import CanApproveTimesheets
from apps.core.exceptions import APIResponse


class TimesheetViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Timesheet CRUD operations and approval workflow
    
    Endpoints:
    - GET /api/v1/timesheets/ - List timesheets
    - POST /api/v1/timesheets/ - Create timesheet
    - GET /api/v1/timesheets/{id}/ - Get timesheet details
    - PUT /api/v1/timesheets/{id}/ - Update timesheet
    - DELETE /api/v1/timesheets/{id}/ - Delete timesheet
    - POST /api/v1/timesheets/{id}/submit/ - Submit for approval
    - POST /api/v1/timesheets/{id}/approve/ - Approve/reject timesheet
    - GET /api/v1/timesheets/pending/ - Get pending timesheets
    - GET /api/v1/timesheets/my_timesheets/ - Get user's own timesheets
    """
    serializer_class = TimesheetSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'employee', 'project', 'date']
    search_fields = ['description', 'employee__email', 'project__name']
    ordering_fields = ['date', 'hours', 'created_at']
    ordering = ['-date']

    def get_queryset(self):
        """Return timesheets based on user role and action"""
        user = self.request.user
        
        # For approve action, allow access to managed projects
        if self.action == 'approve':
            if user.is_admin:
                return Timesheet.objects.all().select_related(
                    'employee', 'project', 'task'
                ).prefetch_related('approvals')
            else:
                # Project managers can access timesheets for their managed projects
                from apps.projects.models import Project
                managed_projects = Project.objects.filter(manager=user)
                return Timesheet.objects.filter(project__in=managed_projects).select_related(
                    'employee', 'project', 'task'
                ).prefetch_related('approvals')
        
        # Admins can see all timesheets
        if user.is_admin:
            return Timesheet.objects.all().select_related(
                'employee', 'project', 'task'
            ).prefetch_related('approvals')
        
        # Employees can only see their own timesheets
        return Timesheet.objects.filter(employee=user).select_related(
            'employee', 'project', 'task'
        ).prefetch_related('approvals')

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return TimesheetCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TimesheetUpdateSerializer
        elif self.action == 'approve':
            return TimesheetApproveSerializer
        return TimesheetSerializer

    def perform_create(self, serializer):
        """Set employee to current user if not admin"""
        if not self.request.user.is_admin:
            serializer.save(employee=self.request.user)
        else:
            serializer.save()

    def create(self, request, *args, **kwargs):
        """Create a new timesheet"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return full details
        timesheet = Timesheet.objects.get(pk=serializer.instance.pk)
        output_serializer = TimesheetSerializer(timesheet)
        
        return Response(
            APIResponse.success(
                output_serializer.data,
                "Timesheet created successfully"
            ),
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        """Update a timesheet"""
        instance = self.get_object()
        
        # Check permission - only admins or the owner can update
        if not request.user.is_admin:
            if instance.employee != request.user:
                return Response(
                    APIResponse.error("You can only update your own timesheets."),
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Check if editable
        if not instance.is_editable:
            return Response(
                APIResponse.error(
                    "Cannot update timesheet that has been submitted or approved."
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Return full details
        timesheet = Timesheet.objects.get(pk=instance.pk)
        output_serializer = TimesheetSerializer(timesheet)
        
        return Response(
            APIResponse.success(
                output_serializer.data,
                "Timesheet updated successfully"
            )
        )

    def destroy(self, request, *args, **kwargs):
        """Delete a timesheet"""
        instance = self.get_object()
        
        # Check permission - only admins or the owner can delete
        if not request.user.is_admin:
            if instance.employee != request.user:
                return Response(
                    APIResponse.error("You can only delete your own timesheets."),
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Check if editable
        if not instance.is_editable:
            return Response(
                APIResponse.error(
                    "Cannot delete timesheet that has been submitted or approved."
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        self.perform_destroy(instance)
        return Response(
            APIResponse.success(None, "Timesheet deleted successfully"),
            status=status.HTTP_204_NO_CONTENT
        )

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit timesheet for approval"""
        timesheet = self.get_object()
        
        # Check permission - only admins or the owner can submit
        if not request.user.is_admin:
            if timesheet.employee != request.user:
                return Response(
                    APIResponse.error("You can only submit your own timesheets."),
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Check status
        if timesheet.status != 'DRAFT' and timesheet.status != 'REJECTED':
            return Response(
                APIResponse.error("Only draft or rejected timesheets can be submitted."),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        timesheet.submit()
        serializer = self.get_serializer(timesheet)
        
        return Response(
            APIResponse.success(
                serializer.data,
                "Timesheet submitted for approval"
            )
        )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve or reject a timesheet - Admin or Project Manager"""
        timesheet = self.get_object()
        serializer = TimesheetApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check permission: Admin or Project Manager of the timesheet's project
        if not request.user.is_admin:
            if not timesheet.project or not request.user.is_project_manager(timesheet.project):
                return Response(
                    APIResponse.error("Only admins or project managers can approve timesheets."),
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Check status
        if timesheet.status != 'SUBMITTED':
            return Response(
                APIResponse.error("Only submitted timesheets can be approved or rejected."),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        status_value = serializer.validated_data['status']
        comments = serializer.validated_data.get('comments', '')
        
        if status_value == 'APPROVED':
            timesheet.approve(request.user)
            message = "Timesheet approved successfully"
        else:
            timesheet.reject(request.user, comments)
            message = "Timesheet rejected successfully"
        
        output_serializer = TimesheetSerializer(timesheet)
        return Response(
            APIResponse.success(output_serializer.data, message)
        )

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending timesheets for approval - Admin or Project Managers"""
        user = request.user
        
        if user.is_admin:
            # Admin can see all pending timesheets
            timesheets = Timesheet.objects.filter(
                status='SUBMITTED'
            ).select_related('employee', 'project', 'task')
        else:
            # Project managers can see pending timesheets for their projects
            from apps.projects.models import Project
            managed_projects = Project.objects.filter(manager=user)
            timesheets = Timesheet.objects.filter(
                status='SUBMITTED',
                project__in=managed_projects
            ).select_related('employee', 'project', 'task')
        
        serializer = self.get_serializer(timesheets, many=True)
        return Response(
            APIResponse.success(
                serializer.data,
                f"Found {timesheets.count()} pending timesheets"
            )
        )

    @action(detail=False, methods=['get'])
    def my_timesheets(self, request):
        """Get current user's timesheets"""
        timesheets = Timesheet.objects.filter(
            employee=request.user
        ).select_related('project', 'task').prefetch_related('approvals')
        
        # Apply filters
        status_filter = request.query_params.get('status')
        if status_filter:
            timesheets = timesheets.filter(status=status_filter)
        
        serializer = self.get_serializer(timesheets, many=True)
        return Response(
            APIResponse.success(
                serializer.data,
                f"Found {timesheets.count()} timesheets"
            )
        )


class TimesheetApprovalViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing timesheet approvals
    """
    queryset = TimesheetApproval.objects.all().select_related(
        'timesheet', 'approved_by'
    )
    serializer_class = TimesheetApprovalSerializer
    permission_classes = [IsAuthenticated, CanApproveTimesheets]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'approved_by']
    ordering_fields = ['approved_at']
    ordering = ['-approved_at']
