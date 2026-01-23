"""
Django management command to validate GCP configuration and database connection.

Usage:
    python manage.py validate_gcp_setup
    python manage.py validate_gcp_setup --verbose
"""

from django.core.management.base import BaseCommand, CommandError
from apps.core.services.gcp_utils import ADCValidator, GCPSecretManager
from apps.core.services.database_config import GCPDatabaseValidator
import os


class Command(BaseCommand):
    help = 'Validate GCP configuration and database connection'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed configuration information',
        )

    def handle(self, *args, **options):
        verbose = options['verbose']
        
        self.stdout.write(self.style.WARNING('=' * 70))
        self.stdout.write(self.style.WARNING('GCP Database Setup Validation'))
        self.stdout.write(self.style.WARNING('=' * 70))
        self.stdout.write('')

        # Check if GCP is enabled
        use_gcp = os.getenv('USE_GCP_SECRETS', 'False').lower() == 'true'
        environment = os.getenv('ENVIRONMENT', 'dev')
        
        self.stdout.write(f'Environment: {environment}')
        self.stdout.write(f'Use GCP Secrets: {use_gcp}')
        self.stdout.write('')

        if not use_gcp:
            self.stdout.write(self.style.WARNING('GCP integration is disabled (USE_GCP_SECRETS=False)'))
            self.stdout.write('Using local database configuration.')
            return

        # Step 1: Validate ADC
        self.stdout.write(self.style.HTTP_INFO('Step 1: Validating Application Default Credentials'))
        self.stdout.write('-' * 70)
        
        is_valid, message = ADCValidator.validate_adc()
        if is_valid:
            self.stdout.write(self.style.SUCCESS(f'✓ {message}'))
        else:
            self.stdout.write(self.style.ERROR(f'✗ {message}'))
            self.stdout.write('')
            self.stdout.write(self.style.ERROR('Setup failed! Run:'))
            self.stdout.write('  gcloud auth application-default login')
            raise CommandError('ADC validation failed')

        if verbose:
            info = ADCValidator.get_adc_info()
            self.stdout.write(f'  • ADC File: {info.get("adc_file_env")}')
            self.stdout.write(f'  • Project: {info.get("project")}')
            self.stdout.write(f'  • Type: {info.get("type")}')

        self.stdout.write('')

        # Step 2: Validate Configuration
        self.stdout.write(self.style.HTTP_INFO('Step 2: Validating Database Configuration'))
        self.stdout.write('-' * 70)
        
        is_valid, message = GCPDatabaseValidator.validate_config()
        if is_valid:
            self.stdout.write(self.style.SUCCESS(f'✓ {message}'))
        else:
            self.stdout.write(self.style.ERROR(f'✗ {message}'))
            self.stdout.write('')
            self.stdout.write(self.style.ERROR('Configuration validation failed!'))
            self.stdout.write('Check your .env file and ensure all required variables are set.')
            raise CommandError('Configuration validation failed')

        if verbose:
            self.stdout.write(f'  • DB Host: {os.getenv("DB_HOST")}')
            self.stdout.write(f'  • DB Name: {os.getenv("DB_NAME")}')
            self.stdout.write(f'  • DB User: {os.getenv("DB_USER")}')
            self.stdout.write(f'  • DB Schema: {os.getenv("DB_SCHEMA", "public")}')
            self.stdout.write(f'  • Secret ID: {os.getenv("DB_PASSWORD_SECRET_ID")}')

        self.stdout.write('')

        # Step 3: Test Secret Manager Access
        self.stdout.write(self.style.HTTP_INFO('Step 3: Testing Secret Manager Access'))
        self.stdout.write('-' * 70)
        
        try:
            secret_id = os.getenv('DB_PASSWORD_SECRET_ID')
            project_id = os.getenv('GCP_PROJECT_ID')
            
            secret_manager = GCPSecretManager(project_id)
            password = secret_manager.get_secret(secret_id)
            secret_manager.close()
            
            self.stdout.write(self.style.SUCCESS(f'✓ Secret retrieved successfully from: {secret_id}'))
            self.stdout.write(f'  • Password length: {len(password)} characters')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Failed to retrieve secret: {str(e)}'))
            self.stdout.write('')
            self.stdout.write(self.style.ERROR('Secret Manager access failed!'))
            self.stdout.write('Ensure:')
            self.stdout.write('  1. Secret exists in Secret Manager')
            self.stdout.write('  2. Service account has secretmanager.secretAccessor role')
            self.stdout.write('  3. You have permission to impersonate the service account')
            raise CommandError('Secret Manager access failed')

        self.stdout.write('')

        # Step 4: Test Database Connection
        self.stdout.write(self.style.HTTP_INFO('Step 4: Testing Database Connection'))
        self.stdout.write('-' * 70)
        
        is_connected, message = GCPDatabaseValidator.test_connection()
        if is_connected:
            self.stdout.write(self.style.SUCCESS(f'✓ {message}'))
            
            if verbose:
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute("SELECT version()")
                    version = cursor.fetchone()[0]
                    self.stdout.write(f'  • PostgreSQL: {version[:70]}...')
                    
                    cursor.execute("SELECT current_schema()")
                    schema = cursor.fetchone()[0]
                    self.stdout.write(f'  • Current schema: {schema}')
        else:
            self.stdout.write(self.style.ERROR(f'✗ {message}'))
            self.stdout.write('')
            self.stdout.write(self.style.ERROR('Database connection failed!'))
            self.stdout.write('Check:')
            self.stdout.write('  1. Database host and port are correct')
            self.stdout.write('  2. Database user has access permissions')
            self.stdout.write('  3. Network connectivity to CloudSQL')
            self.stdout.write('  4. Firewall rules allow connection')
            raise CommandError('Database connection failed')

        self.stdout.write('')

        # Step 5: Optional - Test Cloud Storage
        gcs_bucket = os.getenv('GCS_BUCKET_NAME')
        if gcs_bucket and gcs_bucket.strip():
            self.stdout.write(self.style.HTTP_INFO('Step 5: Testing Cloud Storage Access (Optional)'))
            self.stdout.write('-' * 70)
            
            try:
                from apps.core.services.gcp_utils import GCPStorage
                storage = GCPStorage()
                
                # Just initialize - don't upload anything
                self.stdout.write(self.style.SUCCESS(f'✓ Cloud Storage client initialized'))
                self.stdout.write(f'  • Bucket: {storage.bucket_name}')
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'⚠ Cloud Storage initialization failed: {str(e)}'))
                self.stdout.write('  (This is optional and won\'t affect database connectivity)')
            
            self.stdout.write('')
        else:
            self.stdout.write(self.style.HTTP_INFO('Step 5: Cloud Storage - Skipped (Not Configured)'))
            self.stdout.write('-' * 70)
            self.stdout.write('  GCS_BUCKET_NAME not set - Cloud Storage not needed for database-only setup')
            self.stdout.write('')

        # Success summary
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('✓ All validations passed!'))
        self.stdout.write(self.style.SUCCESS('✓ GCP setup is working correctly'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write('')
        self.stdout.write('Your application is ready to use GCP database with auto-token generation.')
        self.stdout.write('')
        self.stdout.write('Next steps:')
        self.stdout.write('  1. Run migrations: python manage.py migrate')
        self.stdout.write('  2. Create superuser: python manage.py createsuperuser')
        self.stdout.write('  3. Start server: python manage.py runserver')
