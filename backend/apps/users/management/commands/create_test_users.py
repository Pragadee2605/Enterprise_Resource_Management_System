"""
Management command to create dummy users for testing
Creates users with different roles (DEV, QA, etc.) and assigns them to a project
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.users.models import User
from apps.projects.models import Project, ProjectMember
from apps.departments.models import Department


class Command(BaseCommand):
    help = 'Create dummy test users with different roles and assign them to a project'

    def add_arguments(self, parser):
        parser.add_argument(
            '--project-id',
            type=str,
            help='Project ID to assign users to (if not provided, uses first available project)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n🚀 Creating test users...\n'))
        
        try:
            with transaction.atomic():
                # Get or create a default department for test users
                department, _ = Department.objects.get_or_create(
                    code='TEST',
                    defaults={
                        'name': 'Test Department',
                        'description': 'Department for test users',
                        'is_active': True
                    }
                )
                self.stdout.write(f'  ✓ Using department: {department.name}')
                
                # Get project to assign users to
                project_id = options.get('project_id')
                if project_id:
                    try:
                        project = Project.objects.get(id=project_id)
                    except Project.DoesNotExist:
                        self.stdout.write(self.style.ERROR(f'  ✗ Project with ID {project_id} not found'))
                        return
                else:
                    project = Project.objects.first()
                    if not project:
                        self.stdout.write(self.style.ERROR('  ✗ No projects found. Please create a project first.'))
                        return
                
                self.stdout.write(f'  ✓ Will assign users to project: {project.name}\n')
                
                # Define test users with different roles
                test_users = [
                    {
                        'email': 'dev1@test.com',
                        'first_name': 'Alice',
                        'last_name': 'Developer',
                        'role': 'EMPLOYEE',
                        'employee_id': 'DEV001',
                        'project_role': 'DEVELOPER',
                        'phone_number': '+1111111111',
                    },
                    {
                        'email': 'dev2@test.com',
                        'first_name': 'Bob',
                        'last_name': 'Developer',
                        'role': 'EMPLOYEE',
                        'employee_id': 'DEV002',
                        'project_role': 'DEVELOPER',
                        'phone_number': '+1111111112',
                    },
                    {
                        'email': 'qa1@test.com',
                        'first_name': 'Carol',
                        'last_name': 'Tester',
                        'role': 'EMPLOYEE',
                        'employee_id': 'QA001',
                        'project_role': 'TESTER',
                        'phone_number': '+1111111113',
                    },
                    {
                        'email': 'qa2@test.com',
                        'first_name': 'David',
                        'last_name': 'Tester',
                        'role': 'EMPLOYEE',
                        'employee_id': 'QA002',
                        'project_role': 'TESTER',
                        'phone_number': '+1111111114',
                    },
                    {
                        'email': 'analyst1@test.com',
                        'first_name': 'Emma',
                        'last_name': 'Analyst',
                        'role': 'EMPLOYEE',
                        'employee_id': 'BA001',
                        'project_role': 'ANALYST',
                        'phone_number': '+1111111115',
                    },
                    {
                        'email': 'designer1@test.com',
                        'first_name': 'Frank',
                        'last_name': 'Designer',
                        'role': 'EMPLOYEE',
                        'employee_id': 'DES001',
                        'project_role': 'DESIGNER',
                        'phone_number': '+1111111116',
                    },
                    {
                        'email': 'lead1@test.com',
                        'first_name': 'Grace',
                        'last_name': 'Lead',
                        'role': 'MANAGER',
                        'employee_id': 'LEAD001',
                        'project_role': 'LEAD',
                        'phone_number': '+1111111117',
                    },
                ]
                
                created_count = 0
                assigned_count = 0
                
                for user_data in test_users:
                    project_role = user_data.pop('project_role')
                    
                    # Create or get user
                    user, created = User.objects.get_or_create(
                        email=user_data['email'],
                        defaults={
                            **user_data,
                            'department': department
                        }
                    )
                    
                    if created:
                        user.set_password('Test@123')  # Default password for all test users
                        user.save()
                        created_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'  ✓ Created: {user.email} ({user.get_full_name()}) - Role: {user.role}'
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f'  ⚠ Already exists: {user.email} ({user.get_full_name()})'
                            )
                        )
                    
                    # Assign to project
                    member, member_created = ProjectMember.objects.get_or_create(
                        project=project,
                        user=user,
                        defaults={
                            'role': project_role,
                            'is_active': True
                        }
                    )
                    
                    if member_created:
                        assigned_count += 1
                        self.stdout.write(
                            f'    → Assigned to {project.name} as {project_role}'
                        )
                    else:
                        self.stdout.write(
                            f'    → Already member of {project.name} as {member.role}'
                        )
                
                self.stdout.write(self.style.SUCCESS(
                    f'\n✅ Summary:\n'
                    f'  • Created: {created_count} new users\n'
                    f'  • Assigned: {assigned_count} users to project "{project.name}"\n'
                    f'  • Total test users: {len(test_users)}\n'
                    f'  • Default password for all test users: Test@123\n'
                ))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Error creating test users: {str(e)}'))
            raise
