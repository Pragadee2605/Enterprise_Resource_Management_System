#!/usr/bin/env python
"""
Seed script for ERMS - Creates demo data for development and testing
"""
import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.departments.models import Department

User = get_user_model()


def create_departments():
    """Create demo departments."""
    print("Creating departments...")
    
    departments = [
        {
            'name': 'Engineering',
            'code': 'ENG',
            'description': 'Software development and engineering team'
        },
        {
            'name': 'Marketing',
            'code': 'MKT',
            'description': 'Marketing and communications team'
        },
        {
            'name': 'Sales',
            'code': 'SLS',
            'description': 'Sales and business development team'
        },
        {
            'name': 'Human Resources',
            'code': 'HR',
            'description': 'Human resources and administration'
        },
        {
            'name': 'Finance',
            'code': 'FIN',
            'description': 'Finance and accounting team'
        },
    ]
    
    created_depts = []
    for dept_data in departments:
        dept, created = Department.objects.get_or_create(
            code=dept_data['code'],
            defaults=dept_data
        )
        created_depts.append(dept)
        print(f"  {'Created' if created else 'Found'}: {dept.name}")
    
    return created_depts


def create_users(departments):
    """Create demo users with different roles."""
    print("\nCreating users...")
    
    # Admin user
    admin, created = User.objects.get_or_create(
        email='admin@erms.com',
        defaults={
            'first_name': 'System',
            'last_name': 'Administrator',
            'role': 'ADMIN',
            'employee_id': 'ADM001',
            'is_staff': True,
            'is_superuser': True,
        }
    )
    if created:
        admin.set_password('Admin@123')
        admin.save()
    print(f"  {'Created' if created else 'Found'}: {admin.email} (Admin)")
    
    # Managers
    managers_data = [
        {
            'email': 'john.manager@erms.com',
            'first_name': 'John',
            'last_name': 'Manager',
            'role': 'MANAGER',
            'employee_id': 'MGR001',
            'department': departments[0],  # Engineering
            'phone_number': '+1234567890',
        },
        {
            'email': 'sarah.lead@erms.com',
            'first_name': 'Sarah',
            'last_name': 'Lead',
            'role': 'MANAGER',
            'employee_id': 'MGR002',
            'department': departments[1],  # Marketing
            'phone_number': '+1234567891',
        },
    ]
    
    managers = []
    for manager_data in managers_data:
        manager, created = User.objects.get_or_create(
            email=manager_data['email'],
            defaults=manager_data
        )
        if created:
            manager.set_password('Manager@123')
            manager.save()
        managers.append(manager)
        print(f"  {'Created' if created else 'Found'}: {manager.email} (Manager)")
    
    # Set department managers
    departments[0].manager = managers[0]
    departments[0].save()
    departments[1].manager = managers[1]
    departments[1].save()
    
    # Employees
    employees_data = [
        {
            'email': 'alice.dev@erms.com',
            'first_name': 'Alice',
            'last_name': 'Developer',
            'role': 'EMPLOYEE',
            'employee_id': 'EMP001',
            'department': departments[0],
            'phone_number': '+1234567892',
        },
        {
            'email': 'bob.dev@erms.com',
            'first_name': 'Bob',
            'last_name': 'Developer',
            'role': 'EMPLOYEE',
            'employee_id': 'EMP002',
            'department': departments[0],
            'phone_number': '+1234567893',
        },
        {
            'email': 'carol.designer@erms.com',
            'first_name': 'Carol',
            'last_name': 'Designer',
            'role': 'EMPLOYEE',
            'employee_id': 'EMP003',
            'department': departments[1],
            'phone_number': '+1234567894',
        },
        {
            'email': 'dave.sales@erms.com',
            'first_name': 'Dave',
            'last_name': 'Sales',
            'role': 'EMPLOYEE',
            'employee_id': 'EMP004',
            'department': departments[2],
            'phone_number': '+1234567895',
        },
    ]
    
    employees = []
    for emp_data in employees_data:
        employee, created = User.objects.get_or_create(
            email=emp_data['email'],
            defaults=emp_data
        )
        if created:
            employee.set_password('Employee@123')
            employee.save()
        employees.append(employee)
        print(f"  {'Created' if created else 'Found'}: {employee.email} (Employee)")
    
    return {
        'admin': admin,
        'managers': managers,
        'employees': employees
    }


def main():
    """Main seed function."""
    print("=" * 60)
    print("ERMS Database Seeding Script")
    print("=" * 60)
    
    # Create departments
    departments = create_departments()
    
    # Create users
    users = create_users(departments)
    
    print("\n" + "=" * 60)
    print("Seeding Complete!")
    print("=" * 60)
    print("\nDemo Credentials:")
    print("-" * 60)
    print("Admin:")
    print("  Email: admin@erms.com")
    print("  Password: Admin@123")
    print("\nManager:")
    print("  Email: john.manager@erms.com")
    print("  Password: Manager@123")
    print("\nEmployee:")
    print("  Email: alice.dev@erms.com")
    print("  Password: Employee@123")
    print("-" * 60)
    print("\nYou can now login to the application!")
    print("Frontend: http://localhost:3000")
    print("Django Admin: http://localhost:8000/admin")
    print("=" * 60)


if __name__ == '__main__':
    main()
