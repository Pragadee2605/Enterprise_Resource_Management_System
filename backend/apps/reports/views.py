"""
Views for Reports App
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.http import HttpResponse
from django.utils import timezone
from datetime import datetime, timedelta

from apps.users.permissions import CanGenerateReports
from apps.projects.models import Project
from apps.timesheets.models import Timesheet
from apps.core.exceptions import APIResponse
from .services import ReportService


class ProjectReportView(APIView):
    """
    Generate project progress reports
    
    GET /api/v1/reports/projects/?format=csv|pdf&status=ACTIVE&department=123
    """
    permission_classes = [IsAuthenticated, CanGenerateReports]
    
    def get(self, request):
        """Generate project report"""
        # Get query parameters
        format_type = request.query_params.get('format', 'csv')
        status_filter = request.query_params.get('status')
        department_filter = request.query_params.get('department')
        
        # Build queryset - admins see all, project managers see only their projects
        if request.user.is_admin:
            projects = Project.objects.all().select_related('department')
        else:
            projects = Project.objects.filter(manager=request.user).select_related('department')
        
        if status_filter:
            projects = projects.filter(status=status_filter)
        
        if department_filter:
            projects = projects.filter(department_id=department_filter)
        
        projects = projects.prefetch_related('tasks', 'timesheets')
        
        # Generate report
        if format_type == 'pdf':
            buffer = ReportService.generate_project_report_pdf(projects)
            response = HttpResponse(buffer, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="project_report_{timezone.now().strftime("%Y%m%d")}.pdf"'
            return response
        else:
            csv_data = ReportService.generate_project_report_csv(projects)
            response = HttpResponse(csv_data, content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="project_report_{timezone.now().strftime("%Y%m%d")}.csv"'
            return response


class TimesheetReportView(APIView):
    """
    Generate timesheet reports
    
    GET /api/v1/reports/timesheets/?format=csv&employee=123&start_date=2024-01-01&end_date=2024-01-31
    """
    permission_classes = [IsAuthenticated, CanGenerateReports]
    
    def get(self, request):
        """Generate timesheet report"""
        # Get query parameters
        format_type = request.query_params.get('format', 'csv')
        employee_filter = request.query_params.get('employee')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        status_filter = request.query_params.get('status')
        
        # Build queryset - admins see all, project managers see only their projects' timesheets
        if request.user.is_admin:
            timesheets = Timesheet.objects.all().select_related(
                'employee', 'project', 'task'
            )
        else:
            from django.db.models import Q
            managed_projects = Project.objects.filter(manager=request.user)
            timesheets = Timesheet.objects.filter(
                Q(project__in=managed_projects) | Q(employee=request.user)
            ).select_related('employee', 'project', 'task')
        
        if employee_filter:
            timesheets = timesheets.filter(employee_id=employee_filter)
        
        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d').date()
                timesheets = timesheets.filter(date__gte=start)
            except ValueError:
                return Response(
                    {"error": "Invalid start_date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d').date()
                timesheets = timesheets.filter(date__lte=end)
            except ValueError:
                return Response(
                    {"error": "Invalid end_date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if status_filter:
            timesheets = timesheets.filter(status=status_filter)
        
        # Generate report
        csv_data = ReportService.generate_timesheet_report_csv(timesheets)
        response = HttpResponse(csv_data, content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="timesheet_report_{timezone.now().strftime("%Y%m%d")}.csv"'
        return response


class EmployeeWorkloadReportView(APIView):
    """
    Generate employee workload report
    
    GET /api/v1/reports/workload/?start_date=2024-01-01&end_date=2024-01-31
    """
    permission_classes = [IsAuthenticated, CanGenerateReports]
    
    def get(self, request):
        """Generate employee workload report"""
        # Get query parameters
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        # Default to current month if not provided
        if not start_date_str or not end_date_str:
            today = timezone.now().date()
            start_date = today.replace(day=1)
            # Get last day of month
            if today.month == 12:
                end_date = today.replace(day=31)
            else:
                end_date = today.replace(month=today.month+1, day=1) - timedelta(days=1)
        else:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {"error": "Invalid date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Generate report
        csv_data = ReportService.generate_employee_workload_csv(start_date, end_date)
        response = HttpResponse(csv_data, content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="workload_report_{start_date.strftime("%Y%m%d")}_{end_date.strftime("%Y%m%d")}.csv"'
        return response


class ReportSummaryView(APIView):
    """
    Get summary statistics for reports dashboard
    Pure Jira Architecture: Users see stats for their own projects only
    
    GET /api/v1/reports/summary/
    """
    permission_classes = [IsAuthenticated, CanGenerateReports]
    
    def get(self, request):
        """Get report summary statistics for user's projects"""
        from apps.users.models import User
        from apps.tasks.models import Task
        from django.db.models import Sum, Avg, Count, Q
        
        user = request.user
        
        # Get current month date range
        today = timezone.now().date()
        start_of_month = today.replace(day=1)
        
        # Admin sees all, project managers see only their managed projects
        if user.is_admin:
            user_projects = Project.objects.all()
            pending_timesheets = Timesheet.objects.filter(status='SUBMITTED')
            all_timesheets = Timesheet.objects.filter(date__gte=start_of_month)
            all_tasks = Task.objects.all()
            total_employees = User.objects.filter(is_active=True, role='EMPLOYEE').count()
        else:
            # Project managers see stats for their managed projects
            user_projects = Project.objects.filter(manager=user)
            pending_timesheets = Timesheet.objects.filter(
                project__in=user_projects,
                status='SUBMITTED'
            )
            all_timesheets = Timesheet.objects.filter(
                project__in=user_projects,
                date__gte=start_of_month
            )
            all_tasks = Task.objects.filter(project__in=user_projects)
            # Count employees in managed projects
            total_employees = User.objects.filter(
                is_active=True,
                role='EMPLOYEE',
                projects__in=user_projects
            ).distinct().count()
        
        # Calculate statistics
        stats = {
            'total_projects': user_projects.filter(status='ACTIVE').count(),
            'total_employees': total_employees,
            'total_tasks': all_tasks.exclude(status='COMPLETED').count(),
            'pending_timesheets': pending_timesheets.count(),
            'current_month_hours': all_timesheets.filter(
                status='APPROVED'
            ).aggregate(total=Sum('hours'))['total'] or 0,
            'projects_by_status': list(
                user_projects.values('status').annotate(count=Count('id'))
            ),
            'timesheets_by_status': list(
                all_timesheets.values('status').annotate(count=Count('id'))
            ),
        }
        
        return Response(stats)
