"""
Database Configuration for GCP PostgreSQL with Auto Token Management.

This module provides database configuration that:
1. Retrieves database credentials from GCP Secret Manager
2. Uses automatic token generation via ADC
3. Supports multiple environments (dev, qa, uat, prod)
4. Handles both GCP and local database connections
"""

import os
import logging
from typing import Dict, Any, Optional
from .gcp_utils import GCPSecretManager

logger = logging.getLogger(__name__)


class DatabaseConfig:
    """
    Database configuration manager with GCP Secret Manager integration.
    
    Automatically retrieves database credentials from GCP Secret Manager
    using auto-generated access tokens.
    """
    
    def __init__(self):
        """Initialize database configuration."""
        self.use_gcp = os.getenv('USE_GCP_SECRETS', 'False').lower() == 'true'
        self.environment = os.getenv('ENVIRONMENT', 'dev')
        self.project_id = os.getenv('GCP_PROJECT_ID')
        
        logger.info(f"Database configuration initialized - Environment: {self.environment}, Use GCP: {self.use_gcp}")
    
    def get_database_config(self) -> Dict[str, Any]:
        """
        Get database configuration for Django DATABASES setting.
        
        Returns:
            Dictionary with database configuration
        """
        if self.use_gcp:
            return self._get_gcp_database_config()
        else:
            return self._get_local_database_config()
    
    def _get_gcp_database_config(self) -> Dict[str, Any]:
        """
        Get database configuration from GCP Secret Manager.
        
        Uses automatic token generation to retrieve credentials securely.
        
        Returns:
            Dictionary with GCP PostgreSQL database configuration
        """
        try:
            logger.info("Retrieving database configuration from GCP Secret Manager")
            
            # Initialize Secret Manager with auto token generation
            secret_manager = GCPSecretManager(self.project_id)
            
            # Get database connection details from environment
            db_host = os.getenv('DB_HOST')
            db_port = os.getenv('DB_PORT', '5432')
            db_name = os.getenv('DB_NAME')
            db_user = os.getenv('DB_USER')
            db_schema = os.getenv('DB_SCHEMA', 'public')
            
            # Get password secret ID from environment
            password_secret_id = os.getenv('DB_PASSWORD_SECRET_ID')
            
            if not password_secret_id:
                raise ValueError("DB_PASSWORD_SECRET_ID must be set when using GCP secrets")
            
            # Retrieve password from Secret Manager
            # This automatically uses ADC and generates tokens
            logger.info(f"Retrieving database password from secret: {password_secret_id}")
            db_password = secret_manager.get_secret(password_secret_id)
            
            # Close Secret Manager client
            secret_manager.close()
            
            # Build database configuration
            config = {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': db_name,
                'USER': db_user,
                'PASSWORD': db_password,
                'HOST': db_host,
                'PORT': db_port,
                'OPTIONS': {
                    'options': f'-c search_path={db_schema}',
                    'connect_timeout': 10,
                    'keepalives': 1,
                    'keepalives_idle': 30,
                    'keepalives_interval': 10,
                    'keepalives_count': 5,
                },
                'CONN_MAX_AGE': 600,  # Connection pooling
            }
            
            # Add SSL settings if required
            if os.getenv('DB_SSL_REQUIRED', 'False').lower() == 'true':
                config['OPTIONS']['sslmode'] = 'require'
            
            logger.info(f"✓ GCP database configuration retrieved successfully - Host: {db_host}, Database: {db_name}")
            return config
            
        except Exception as e:
            logger.error(f"✗ Failed to retrieve GCP database configuration: {str(e)}")
            raise Exception(f"Database configuration failed: {str(e)}")
    
    def _get_local_database_config(self) -> Dict[str, Any]:
        """
        Get local database configuration from environment variables.
        
        Returns:
            Dictionary with local database configuration
        """
        db_engine = os.getenv('DB_ENGINE', 'django.db.backends.mysql')
        
        config = {
            'ENGINE': db_engine,
            'NAME': os.getenv('DB_NAME', 'erms_db'),
            'USER': os.getenv('DB_USER', 'root'),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '3306'),
        }
        
        # Add MySQL-specific options
        if 'mysql' in db_engine:
            config['OPTIONS'] = {
                'init_command': "SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'",
                'charset': 'utf8mb4',
            }
        
        # Add PostgreSQL-specific options
        elif 'postgresql' in db_engine:
            config['OPTIONS'] = {
                'connect_timeout': 10,
            }
            config['PORT'] = os.getenv('DB_PORT', '5432')
        
        logger.info(f"✓ Local database configuration loaded - Engine: {db_engine}")
        return config


class GCPDatabaseValidator:
    """Validator for GCP database configuration."""
    
    @staticmethod
    def validate_config() -> tuple[bool, str]:
        """
        Validate GCP database configuration.
        
        Returns:
            Tuple of (is_valid, message)
        """
        use_gcp = os.getenv('USE_GCP_SECRETS', 'False').lower() == 'true'
        
        if not use_gcp:
            return True, "Using local database configuration"
        
        # Check required environment variables
        required_vars = [
            'GCP_PROJECT_ID',
            'DB_HOST',
            'DB_NAME',
            'DB_USER',
            'DB_PASSWORD_SECRET_ID'
        ]
        
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            message = f"Missing required environment variables: {', '.join(missing_vars)}"
            logger.error(f"✗ {message}")
            return False, message
        
        # Validate GCP credentials
        try:
            from .gcp_utils import ADCValidator
            is_valid, adc_message = ADCValidator.validate_adc()
            
            if not is_valid:
                return False, f"ADC validation failed: {adc_message}"
            
            logger.info("✓ GCP database configuration validation passed")
            return True, "GCP database configuration is valid"
            
        except Exception as e:
            message = f"Validation error: {str(e)}"
            logger.error(f"✗ {message}")
            return False, message
    
    @staticmethod
    def test_connection() -> tuple[bool, str]:
        """
        Test database connection.
        
        Returns:
            Tuple of (is_connected, message)
        """
        try:
            from django.db import connection
            
            # Force connection
            connection.ensure_connection()
            
            # Test query
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
            
            if result:
                logger.info("✓ Database connection test successful")
                return True, "Database connection successful"
            else:
                return False, "Database query returned no result"
                
        except Exception as e:
            message = f"Database connection failed: {str(e)}"
            logger.error(f"✗ {message}")
            return False, message


# Convenience function
def get_database_config() -> Dict[str, Any]:
    """
    Get database configuration for Django settings.
    
    Returns:
        Dictionary with database configuration
    """
    config_manager = DatabaseConfig()
    return config_manager.get_database_config()


def validate_database_setup() -> bool:
    """
    Validate database setup and configuration.
    
    Returns:
        True if configuration is valid, False otherwise
    """
    is_valid, message = GCPDatabaseValidator.validate_config()
    logger.info(message)
    return is_valid
