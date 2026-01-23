"""
Department Views
"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count
from rest_framework.permissions import IsAuthenticated

from apps.departments.models import Department
from apps.departments.serializers import (
    DepartmentSerializer,
    DepartmentListSerializer,
    DepartmentCreateSerializer,
    DepartmentUpdateSerializer
)
from apps.users.permissions import CanManageDepartments
from apps.core.exceptions import APIResponse


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Department management
    
    Permissions:
    - List/Retrieve: Authenticated users
    - Create/Update/Delete: Admin only
    """
    queryset = Department.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'code', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Annotate queryset with employee count"""
        queryset = super().get_queryset()
        queryset = queryset.annotate(employee_count=Count('employees'))
        
        # Filter by active status if specified
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by manager if specified
        manager_id = self.request.query_params.get('manager')
        if manager_id:
            queryset = queryset.filter(manager_id=manager_id)
        
        return queryset
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return DepartmentListSerializer
        elif self.action == 'create':
            return DepartmentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return DepartmentUpdateSerializer
        return DepartmentSerializer
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), CanManageDepartments()]
        return [IsAuthenticated()]
    
    def create(self, request, *args, **kwargs):
        """Create a new department"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        department = serializer.save()
        
        response_serializer = DepartmentSerializer(department)
        return Response(
            APIResponse.success(
                data=response_serializer.data,
                message='Department created successfully'
            ),
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """Update a department"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        department = serializer.save()
        
        response_serializer = DepartmentSerializer(department)
        return Response(
            APIResponse.success(
                data=response_serializer.data,
                message='Department updated successfully'
            )
        )
    
    def destroy(self, request, *args, **kwargs):
        """Delete a department"""
        instance = self.get_object()
        
        # Check if department has employees
        if instance.employees.exists():
            return Response(
                APIResponse.error(
                    message='Cannot delete department with existing employees',
                    code='department_has_employees'
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
        
        instance.delete()
        return Response(
            APIResponse.success(message='Department deleted successfully'),
            status=status.HTTP_204_NO_CONTENT
        )
    
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def employees(self, request, pk=None):
        """Get all employees in a department"""
        department = self.get_object()
        employees = department.employees.all()
        
        from apps.users.serializers import UserSerializer
        serializer = UserSerializer(employees, many=True)
        
        return Response(
            APIResponse.success(
                data=serializer.data,
                message=f'Employees in {department.name}'
            )
        )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanManageDepartments])
    def activate(self, request, pk=None):
        """Activate a department"""
        department = self.get_object()
        department.is_active = True
        department.save()
        
        serializer = DepartmentSerializer(department)
        return Response(
            APIResponse.success(
                data=serializer.data,
                message='Department activated successfully'
            )
        )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanManageDepartments])
    def deactivate(self, request, pk=None):
        """Deactivate a department"""
        department = self.get_object()
        department.is_active = False
        department.save()
        
        serializer = DepartmentSerializer(department)
        return Response(
            APIResponse.success(
                data=serializer.data,
                message='Department deactivated successfully'
            )
        )
