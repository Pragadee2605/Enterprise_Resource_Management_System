"""
Department Serializers
"""
from rest_framework import serializers
from apps.departments.models import Department
from apps.users.serializers import UserSerializer


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for Department model"""
    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True)
    employee_count = serializers.SerializerMethodField()
    manager_details = UserSerializer(source='manager', read_only=True)
    
    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'description', 'manager', 'manager_name', 
            'manager_details', 'employee_count', 'is_active', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'employee_count']
    
    def get_employee_count(self, obj):
        """Get employee count from annotation or direct count"""
        if hasattr(obj, 'employee_count'):
            return obj.employee_count
        return obj.get_employee_count()
    
    def validate_code(self, value):
        """Validate department code is uppercase and unique"""
        value = value.upper()
        instance = self.instance
        if instance and Department.objects.exclude(pk=instance.pk).filter(code=value).exists():
            raise serializers.ValidationError("Department code must be unique.")
        elif not instance and Department.objects.filter(code=value).exists():
            raise serializers.ValidationError("Department code must be unique.")
        return value


class DepartmentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing departments"""
    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True)
    employee_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'manager_name', 'employee_count', 'is_active']
    
    def get_employee_count(self, obj):
        """Get employee count from annotation or direct count"""
        if hasattr(obj, 'employee_count'):
            return obj.employee_count
        return obj.get_employee_count()


class DepartmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating departments"""
    
    class Meta:
        model = Department
        fields = ['name', 'code', 'description', 'manager', 'is_active']
    
    def validate_code(self, value):
        """Validate department code"""
        value = value.upper()
        if Department.objects.filter(code=value).exists():
            raise serializers.ValidationError("Department code must be unique.")
        return value


class DepartmentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating departments"""
    
    class Meta:
        model = Department
        fields = ['name', 'code', 'description', 'manager', 'is_active']
    
    def validate_code(self, value):
        """Validate department code"""
        value = value.upper()
        if Department.objects.exclude(pk=self.instance.pk).filter(code=value).exists():
            raise serializers.ValidationError("Department code must be unique.")
        return value
