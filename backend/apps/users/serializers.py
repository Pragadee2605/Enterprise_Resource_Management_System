"""
Serializers for User app.
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, LoginAttempt


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'phone_number', 'employee_id', 'department',
            'department_name', 'is_active', 'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']
    
    def validate_email(self, value):
        """Validate email uniqueness."""
        if self.instance and self.instance.email == value:
            return value
        
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new users."""
    
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm', 'first_name', 'last_name',
            'role', 'phone_number', 'employee_id', 'department'
        ]
    
    def validate(self, attrs):
        """Validate that passwords match."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def create(self, validated_data):
        """Create user with hashed password."""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating existing users."""
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'role', 'phone_number',
            'employee_id', 'department', 'is_active'
        ]


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing user password."""
    
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        """Validate that new passwords match."""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    
    def validate(self, attrs):
        """Validate login credentials."""
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """Detailed serializer for user profile."""
    
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_id = serializers.UUIDField(source='department.id', read_only=True)
    is_admin = serializers.SerializerMethodField()
    has_usable_password = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'is_admin', 'phone_number', 'employee_id', 'department', 
            'department_name', 'department_id', 'is_active', 'has_usable_password',
            'date_joined', 'last_login', 'updated_at'
        ]
        read_only_fields = ['id', 'email', 'date_joined', 'last_login', 'updated_at']
    
    def get_is_admin(self, obj):
        return obj.role == 'ADMIN'
    
    def get_has_usable_password(self, obj):
        """Check if user has a usable password (False for OAuth users)."""
        return obj.has_usable_password()


class LoginAttemptSerializer(serializers.ModelSerializer):
    """Serializer for login attempts (admin only)."""
    
    class Meta:
        model = LoginAttempt
        fields = ['id', 'ip_address', 'email', 'success', 'timestamp', 'user_agent']
        read_only_fields = ['id', 'timestamp']
