"""
URL Configuration for Reports App
"""
from django.urls import path
from .views import (
    ProjectReportView,
    TimesheetReportView,
    EmployeeWorkloadReportView,
    ReportSummaryView
)

urlpatterns = [
    path('projects/', ProjectReportView.as_view(), name='project-report'),
    path('timesheets/', TimesheetReportView.as_view(), name='timesheet-report'),
    path('workload/', EmployeeWorkloadReportView.as_view(), name='workload-report'),
    path('summary/', ReportSummaryView.as_view(), name='report-summary'),
]
