"""
User models for ERMS.
Implements custom user model with role-based access control.
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
import uuid


class UserManager(BaseUserManager):
    """Custom manager for User model."""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user."""
        if not email:
            raise ValueError('Users must have an email address')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'ADMIN')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model for ERMS.
    Uses email as the unique identifier instead of username.
    """
    
    # Two roles: ADMIN (system administration) and EMPLOYEE (all users)
    ROLE_CHOICES = [
        ('ADMIN', 'Administrator'),
        ('EMPLOYEE', 'Employee'),
    ]
    
    # Primary fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, max_length=255, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    
    # Role and permissions
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='EMPLOYEE')
    
    # Profile information
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    employee_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    
    # Department relationship
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees'
    )
    
    # Status flags
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    # Timestamps
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Password policy
    password_changed_at = models.DateTimeField(default=timezone.now)
    must_change_password = models.BooleanField(default=False)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    def get_full_name(self):
        """Return the user's full name."""
        return f"{self.first_name} {self.last_name}".strip()
    
    def get_short_name(self):
        """Return the user's first name."""
        return self.first_name
    
    @property
    def is_admin(self):
        """Check if user has admin role."""
        return self.role == 'ADMIN'
    
    @property
    def is_employee(self):
        """Check if user has employee role."""
        return self.role == 'EMPLOYEE'
    
    def has_permission(self, permission):
        """
        Check if user has a specific permission based on role.
        Two-tier system: ADMIN (full access) and EMPLOYEE (standard access)
        
        Note: Project-specific permissions (approve_timesheets, view_project_reports)
        should be checked separately using is_project_manager() method
        
        Args:
            permission (str): Permission name
            
        Returns:
            bool: True if user has permission
        """
        permission_map = {
            'ADMIN': [
                'manage_users', 'manage_departments', 'manage_projects',
                'manage_tasks', 'view_all_timesheets', 'approve_all_timesheets',
                'generate_all_reports', 'view_audit_logs', 'system_config',
                'view_own_data', 'submit_timesheets', 'view_assigned_projects'
            ],
            'EMPLOYEE': [
                'view_own_data', 'submit_timesheets', 'view_assigned_projects',
                'manage_projects', 'manage_tasks'
            ],
        }
        
        return permission in permission_map.get(self.role, [])
    
    def is_project_manager(self, project):
        """
        Check if user is the manager of a specific project.
        
        Args:
            project: Project instance or project ID
            
        Returns:
            bool: True if user is the project manager
        """
        if hasattr(project, 'manager'):
            return project.manager == self
        # If project ID is passed, import here to avoid circular import
        from apps.projects.models import Project
        try:
            proj = Project.objects.get(id=project)
            return proj.manager == self
        except Project.DoesNotExist:
            return False


class LoginAttempt(models.Model):
    """Track login attempts for rate limiting and security."""
    
    ip_address = models.GenericIPAddressField()
    email = models.EmailField(max_length=255)
    success = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        db_table = 'login_attempts'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['ip_address', 'timestamp']),
            models.Index(fields=['email', 'timestamp']),
        ]
    
    def __str__(self):
        status = "Success" if self.success else "Failed"
        return f"{status} login attempt for {self.email} from {self.ip_address}"
