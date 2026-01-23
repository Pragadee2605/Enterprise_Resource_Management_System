"""
Script to generate sample data with properly hashed passwords for ERMS
This script creates admin and employee users with Django password hashing
"""
import os
import sys
import django
import uuid
from datetime import datetime

# Setup Django environment
sys.path.append('/Users/pragadeeswaran/Downloads/project/ERMS_Enterprise_Resource_Management_System/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.hashers import make_password
from apps.users.models import User
from apps.departments.models import Department
from django.utils import timezone

def create_departments():
    """Create sample departments"""
    departments_data = [
        {'name': 'Information Technology', 'code': 'IT', 'description': 'Technology and software development department'},
        {'name': 'Human Resources', 'code': 'HR', 'description': 'Human resources and employee management'},
        {'name': 'Finance', 'code': 'FIN', 'description': 'Financial planning and accounting'},
        {'name': 'Marketing', 'code': 'MKT', 'description': 'Marketing and communications'},
        {'name': 'Operations', 'code': 'OPS', 'description': 'Operations and logistics management'},
    ]
    
    created_departments = {}
    for dept_data in departments_data:
        dept, created = Department.objects.get_or_create(
            code=dept_data['code'],
            defaults={
                'name': dept_data['name'],
                'description': dept_data['description'],
                'is_active': True
            }
        )
        created_departments[dept_data['code']] = dept
        print(f"{'Created' if created else 'Found existing'} department: {dept.name}")
    
    return created_departments

def create_admin_users(departments):
    """Create admin users"""
    admin_users_data = [
        {
            'email': 'admin@erms.com',
            'password': 'Admin@123',
            'first_name': 'System',
            'last_name': 'Administrator',
            'role': 'ADMIN',
            'phone_number': '+1-555-0001',
            'employee_id': 'EMP001',
            'department': departments.get('IT'),
        },
        {
            'email': 'it.admin@erms.com',
            'password': 'Admin@123',
            'first_name': 'John',
            'last_name': 'Smith',
            'role': 'ADMIN',
            'phone_number': '+1-555-0002',
            'employee_id': 'EMP002',
            'department': departments.get('IT'),
        },
    ]
    
    created_admins = {}
    for user_data in admin_users_data:
        department = user_data.pop('department')
        password = user_data.pop('password')
        
        user, created = User.objects.get_or_create(
            email=user_data['email'],
            defaults={
                **user_data,
                'password': make_password(password),
                'department': department,
                'is_active': True,
                'is_staff': True,
                'is_superuser': True,
                'date_joined': timezone.now(),
            }
        )
        
        if not created:
            # Update password if user exists
            user.set_password(password)
            user.save()
        
        created_admins[user.employee_id] = user
        print(f"{'Created' if created else 'Updated'} admin: {user.email}")
    
    return created_admins

def create_employee_users(departments):
    """Create employee users"""
    employee_users_data = [
        {
            'email': 'sarah.johnson@erms.com',
            'password': 'Employee@123',
            'first_name': 'Sarah',
            'last_name': 'Johnson',
            'role': 'EMPLOYEE',
            'phone_number': '+1-555-1001',
            'employee_id': 'EMP101',
            'department': departments.get('IT'),
        },
        {
            'email': 'michael.chen@erms.com',
            'password': 'Employee@123',
            'first_name': 'Michael',
            'last_name': 'Chen',
            'role': 'EMPLOYEE',
            'phone_number': '+1-555-1002',
            'employee_id': 'EMP102',
            'department': departments.get('IT'),
        },
        {
            'email': 'emily.davis@erms.com',
            'password': 'Employee@123',
            'first_name': 'Emily',
            'last_name': 'Davis',
            'role': 'EMPLOYEE',
            'phone_number': '+1-555-2001',
            'employee_id': 'EMP201',
            'department': departments.get('HR'),
        },
        {
            'email': 'james.wilson@erms.com',
            'password': 'Employee@123',
            'first_name': 'James',
            'last_name': 'Wilson',
            'role': 'EMPLOYEE',
            'phone_number': '+1-555-2002',
            'employee_id': 'EMP202',
            'department': departments.get('HR'),
        },
        {
            'email': 'robert.brown@erms.com',
            'password': 'Employee@123',
            'first_name': 'Robert',
            'last_name': 'Brown',
            'role': 'EMPLOYEE',
            'phone_number': '+1-555-3001',
            'employee_id': 'EMP301',
            'department': departments.get('FIN'),
        },
        {
            'email': 'lisa.martinez@erms.com',
            'password': 'Employee@123',
            'first_name': 'Lisa',
            'last_name': 'Martinez',
            'role': 'EMPLOYEE',
            'phone_number': '+1-555-3002',
            'employee_id': 'EMP302',
            'department': departments.get('FIN'),
        },
        {
            'email': 'jennifer.taylor@erms.com',
            'password': 'Employee@123',
            'first_name': 'Jennifer',
            'last_name': 'Taylor',
            'role': 'EMPLOYEE',
            'phone_number': '+1-555-4001',
            'employee_id': 'EMP401',
            'department': departments.get('MKT'),
        },
        {
            'email': 'david.anderson@erms.com',
            'password': 'Employee@123',
            'first_name': 'David',
            'last_name': 'Anderson',
            'role': 'EMPLOYEE',
            'phone_number': '+1-555-4002',
            'employee_id': 'EMP402',
            'department': departments.get('MKT'),
        },
        {
            'email': 'patricia.thomas@erms.com',
            'password': 'Employee@123',
            'first_name': 'Patricia',
            'last_name': 'Thomas',
            'role': 'EMPLOYEE',
            'phone_number': '+1-555-5001',
            'employee_id': 'EMP501',
            'department': departments.get('OPS'),
        },
        {
            'email': 'william.garcia@erms.com',
            'password': 'Employee@123',
            'first_name': 'William',
            'last_name': 'Garcia',
            'role': 'EMPLOYEE',
            'phone_number': '+1-555-5002',
            'employee_id': 'EMP502',
            'department': departments.get('OPS'),
        },
    ]
    
    created_employees = {}
    for user_data in employee_users_data:
        department = user_data.pop('department')
        password = user_data.pop('password')
        
        user, created = User.objects.get_or_create(
            email=user_data['email'],
            defaults={
                **user_data,
                'password': make_password(password),
                'department': department,
                'is_active': True,
                'is_staff': False,
                'is_superuser': False,
                'date_joined': timezone.now(),
            }
        )
        
        if not created:
            # Update password if user exists
            user.set_password(password)
            user.save()
        
        created_employees[user.employee_id] = user
        print(f"{'Created' if created else 'Updated'} employee: {user.email}")
    
    return created_employees

def assign_department_managers(departments, users):
    """Assign managers to departments"""
    manager_assignments = {
        'IT': 'EMP002',
        'HR': 'EMP201',
        'FIN': 'EMP301',
        'MKT': 'EMP401',
        'OPS': 'EMP501',
    }
    
    for dept_code, emp_id in manager_assignments.items():
        dept = departments.get(dept_code)
        manager = users.get(emp_id)
        if dept and manager:
            dept.manager = manager
            dept.save()
            print(f"Assigned {manager.get_full_name()} as manager of {dept.name}")

def display_summary():
    """Display summary of created data"""
    print("\n" + "="*60)
    print("SUMMARY OF CREATED DATA")
    print("="*60)
    
    print("\nDEPARTMENTS:")
    for dept in Department.objects.filter(is_active=True):
        manager_name = dept.manager.get_full_name() if dept.manager else "Not assigned"
        employee_count = dept.employees.filter(is_active=True).count()
        print(f"  {dept.code:5} | {dept.name:30} | Manager: {manager_name:20} | Employees: {employee_count}")
    
    print("\nADMIN USERS:")
    for user in User.objects.filter(role='ADMIN', is_active=True):
        print(f"  {user.employee_id:7} | {user.get_full_name():30} | {user.email:30}")
    
    print("\nEMPLOYEE USERS (by Department):")
    for dept in Department.objects.filter(is_active=True):
        print(f"\n  {dept.name}:")
        for user in User.objects.filter(department=dept, role='EMPLOYEE', is_active=True):
            print(f"    {user.employee_id:7} | {user.get_full_name():30} | {user.email:30}")
    
    print("\n" + "="*60)
    print("DEFAULT PASSWORDS:")
    print("  Admin users: Admin@123")
    print("  Employee users: Employee@123")
    print("  ⚠️  IMPORTANT: Change these passwords in production!")
    print("="*60)

def main():
    """Main function to run the data creation script"""
    print("="*60)
    print("ERMS Sample Data Creation Script")
    print("="*60)
    print("\nThis script will create sample data with the following:")
    print("  - 5 Departments")
    print("  - 2 Admin users")
    print("  - 10 Employee users")
    print("\n" + "="*60)
    
    try:
        # Create departments
        print("\n[1/4] Creating departments...")
        departments = create_departments()
        
        # Create admin users
        print("\n[2/4] Creating admin users...")
        admins = create_admin_users(departments)
        
        # Create employee users
        print("\n[3/4] Creating employee users...")
        employees = create_employee_users(departments)
        
        # Assign department managers
        print("\n[4/4] Assigning department managers...")
        all_users = {**admins, **employees}
        assign_department_managers(departments, all_users)
        
        # Display summary
        display_summary()
        
        print("\n✅ Sample data created successfully!")
        
    except Exception as e:
        print(f"\n❌ Error creating sample data: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
