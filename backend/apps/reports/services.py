"""
Report Generation Services
"""
import csv
from io import BytesIO, StringIO
from django.http import HttpResponse
from django.db.models import Sum, Count, Q
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from datetime import datetime, timedelta


class ReportService:
    """Service for generating various reports"""
    
    @staticmethod
    def generate_project_report_csv(projects):
        """Generate project progress report in CSV format"""
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'Project Name', 'Code', 'Status', 'Department',
            'Budget', 'Start Date', 'End Date',
            'Total Tasks', 'Completed Tasks', 'Progress %',
            'Total Hours Logged'
        ])
        
        # Write data
        for project in projects:
            total_tasks = project.tasks.count()
            completed_tasks = project.tasks.filter(status='COMPLETED').count()
            progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
            total_hours = project.timesheets.aggregate(
                total=Sum('hours')
            )['total'] or 0
            
            writer.writerow([
                project.name,
                project.code,
                project.get_status_display(),
                project.department.name if project.department else 'N/A',
                float(project.budget) if project.budget else 0,
                project.start_date.strftime('%Y-%m-%d') if project.start_date else '',
                project.end_date.strftime('%Y-%m-%d') if project.end_date else '',
                total_tasks,
                completed_tasks,
                f"{progress:.2f}",
                float(total_hours)
            ])
        
        return output.getvalue()
    
    @staticmethod
    def generate_project_report_pdf(projects):
        """Generate project progress report in PDF format"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
        
        # Container for the 'Flowable' objects
        elements = []
        
        # Define styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        # Add title
        title = Paragraph("Project Progress Report", title_style)
        elements.append(title)
        elements.append(Spacer(1, 12))
        
        # Add generation date
        date_style = styles['Normal']
        date_text = f"Generated on: {timezone.now().strftime('%B %d, %Y at %I:%M %p')}"
        elements.append(Paragraph(date_text, date_style))
        elements.append(Spacer(1, 20))
        
        # Prepare table data
        data = [['Project', 'Status', 'Budget', 'Tasks', 'Completed', 'Progress', 'Hours']]
        
        for project in projects:
            total_tasks = project.tasks.count()
            completed_tasks = project.tasks.filter(status='COMPLETED').count()
            progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
            total_hours = project.timesheets.aggregate(total=Sum('hours'))['total'] or 0
            
            data.append([
                project.name[:20],
                project.get_status_display(),
                f"${float(project.budget):,.2f}" if project.budget else '$0',
                str(total_tasks),
                str(completed_tasks),
                f"{progress:.1f}%",
                f"{float(total_hours):.1f}h"
            ])
        
        # Create table
        table = Table(data, colWidths=[2.2*inch, 0.8*inch, 1*inch, 0.6*inch, 0.8*inch, 0.7*inch, 0.7*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498db')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
        ]))
        
        elements.append(table)
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def generate_timesheet_report_csv(timesheets):
        """Generate timesheet summary report in CSV format"""
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'Employee', 'Employee ID', 'Project', 'Task',
            'Date', 'Hours', 'Description', 'Status',
            'Submitted At'
        ])
        
        # Write data
        for timesheet in timesheets:
            writer.writerow([
                timesheet.employee.get_full_name(),
                timesheet.employee.employee_id or 'N/A',
                timesheet.project.name,
                timesheet.task.title if timesheet.task else 'N/A',
                timesheet.date.strftime('%Y-%m-%d'),
                float(timesheet.hours),
                timesheet.description,
                timesheet.get_status_display(),
                timesheet.submitted_at.strftime('%Y-%m-%d %H:%M') if timesheet.submitted_at else 'Not Submitted'
            ])
        
        return output.getvalue()
    
    @staticmethod
    def generate_employee_workload_csv(start_date, end_date):
        """Generate employee workload report in CSV format"""
        from apps.users.models import User
        from apps.timesheets.models import Timesheet
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'Employee', 'Employee ID', 'Department', 'Role',
            'Total Hours', 'Projects Worked', 'Avg Hours/Day',
            'Status'
        ])
        
        # Get all active employees
        employees = User.objects.filter(is_active=True).select_related('department')
        
        for employee in employees:
            timesheets = Timesheet.objects.filter(
                employee=employee,
                date__range=[start_date, end_date],
                status='APPROVED'
            )
            
            total_hours = timesheets.aggregate(total=Sum('hours'))['total'] or 0
            projects_count = timesheets.values('project').distinct().count()
            
            # Calculate average hours per day
            days = (end_date - start_date).days + 1
            avg_hours = total_hours / days if days > 0 else 0
            
            writer.writerow([
                employee.get_full_name(),
                employee.employee_id or 'N/A',
                employee.department.name if employee.department else 'N/A',
                employee.get_role_display(),
                float(total_hours),
                projects_count,
                f"{avg_hours:.2f}",
                'Active' if employee.is_active else 'Inactive'
            ])
        
        return output.getvalue()
