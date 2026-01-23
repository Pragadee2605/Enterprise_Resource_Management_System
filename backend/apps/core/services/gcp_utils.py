"""
GCP Utilities for Secret Manager and Cloud Storage with Auto Token Generation.

This module provides utilities for:
1. Automatic token generation using Application Default Credentials (ADC)
2. Service account impersonation for secure access
3. Secret Manager integration for retrieving credentials
4. Cloud Storage operations

Authentication Flow:
- Uses application_default_credentials.json for ADC
- Automatically generates and refreshes access tokens
- Impersonates service account for API calls
- No manual token management required
"""

import os
import logging
from typing import Optional, Dict, Any
from google.cloud import secretmanager
from google.cloud import storage
from google.auth import default
from google.oauth2 import service_account
import json

logger = logging.getLogger(__name__)


class GCPSecretManager:
    """
    GCP Secret Manager client with automatic token generation.
    
    Uses Application Default Credentials (ADC) to automatically:
    - Generate access tokens via service account impersonation
    - Refresh tokens before expiration
    - Handle authentication transparently
    """
    
    def __init__(self, project_id: Optional[str] = None):
        """
        Initialize Secret Manager client.
        
        Args:
            project_id: GCP project ID. If not provided, reads from environment variable.
        """
        self.project_id = project_id or os.getenv('GCP_PROJECT_ID')
        
        if not self.project_id:
            raise ValueError("GCP_PROJECT_ID must be set in environment or passed as parameter")
        
        # SecretManagerServiceClient automatically uses ADC for authentication
        # It will use application_default_credentials.json to generate tokens
        self._client = None
        logger.info(f"GCP Secret Manager initialized for project: {self.project_id}")
    
    @property
    def client(self):
        """Lazy initialization of Secret Manager client."""
        if self._client is None:
            try:
                # This automatically uses ADC and generates tokens
                self._client = secretmanager.SecretManagerServiceClient()
                logger.info("Secret Manager client created successfully using ADC")
            except Exception as e:
                logger.error(f"Failed to create Secret Manager client: {str(e)}")
                raise
        return self._client
    
    def get_secret(self, secret_id: str, version: str = "latest") -> str:
        """
        Retrieve a secret from GCP Secret Manager.
        
        This method automatically:
        - Uses ADC to authenticate
        - Generates access tokens via service account impersonation
        - Refreshes tokens as needed
        
        Args:
            secret_id: The ID of the secret (e.g., 'db_password')
            version: The version of the secret (default: 'latest')
        
        Returns:
            The secret value as a string
        
        Raises:
            Exception: If secret retrieval fails
        """
        try:
            # Build the resource name
            name = f"projects/{self.project_id}/secrets/{secret_id}/versions/{version}"
            
            logger.info(f"Retrieving secret: {secret_id} from project: {self.project_id}")
            
            # Access the secret version
            # The client automatically includes the auto-generated token in this request
            response = self.client.access_secret_version(request={"name": name})
            
            # Extract and decode the secret payload
            payload = response.payload.data.decode('UTF-8').strip()
            
            logger.info(f"GCP secret retrieved successfully for: {secret_id}")
            return payload
            
        except Exception as e:
            logger.error(f"GCP secret retrieval failed for {secret_id}: {str(e)}")
            raise Exception(f"Failed to retrieve secret {secret_id}: {str(e)}")
    
    def get_secret_json(self, secret_id: str, version: str = "latest") -> Dict[str, Any]:
        """
        Retrieve a secret and parse it as JSON.
        
        Args:
            secret_id: The ID of the secret
            version: The version of the secret (default: 'latest')
        
        Returns:
            The secret value parsed as a dictionary
        """
        secret_value = self.get_secret(secret_id, version)
        try:
            return json.loads(secret_value)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse secret {secret_id} as JSON: {str(e)}")
            raise
    
    def close(self):
        """Close the Secret Manager client."""
        if self._client:
            self._client.close()
            logger.info("Secret Manager client closed")


class GCPStorage:
    """
    GCP Cloud Storage client with automatic token generation.
    
    Uses Application Default Credentials (ADC) for authentication.
    Automatically handles token generation and refresh.
    
    NOTE: This is OPTIONAL. Only use if you need Cloud Storage.
    """
    
    def __init__(self, bucket_name: Optional[str] = None):
        """
        Initialize Cloud Storage client.
        
        Args:
            bucket_name: GCS bucket name. If not provided, reads from environment variable.
        """
        self.bucket_name = bucket_name or os.getenv('GCS_BUCKET_NAME')
        
        if not self.bucket_name:
            raise ValueError("GCS_BUCKET_NAME must be set in environment or passed as parameter. "
                           "If you only need database connection, you can skip Cloud Storage.")
        
        # Storage client automatically uses ADC for authentication
        try:
            self.storage_client = storage.Client()
            self.bucket = self.storage_client.bucket(self.bucket_name)
            logger.info(f"GCP Storage initialized for bucket: {self.bucket_name}")
        except Exception as e:
            logger.error(f"Failed to initialize GCP Storage: {str(e)}")
            raise
    
    def upload_file(self, source_file_path: str, destination_blob_name: str) -> str:
        """
        Upload a file to GCS.
        
        Args:
            source_file_path: Local file path
            destination_blob_name: Destination path in GCS bucket
        
        Returns:
            Public URL of the uploaded file
        """
        try:
            blob = self.bucket.blob(destination_blob_name)
            blob.upload_from_filename(source_file_path)
            
            logger.info(f"File uploaded: {source_file_path} -> gs://{self.bucket_name}/{destination_blob_name}")
            return blob.public_url
        except Exception as e:
            logger.error(f"File upload failed: {str(e)}")
            raise
    
    def upload_bytes(self, file_bytes: bytes, destination_blob_name: str, content_type: str = None) -> str:
        """
        Upload bytes to GCS.
        
        Args:
            file_bytes: File content as bytes
            destination_blob_name: Destination path in GCS bucket
            content_type: MIME type of the file
        
        Returns:
            Public URL of the uploaded file
        """
        try:
            blob = self.bucket.blob(destination_blob_name)
            
            if content_type:
                blob.content_type = content_type
            
            blob.upload_from_string(file_bytes)
            
            logger.info(f"Bytes uploaded to: gs://{self.bucket_name}/{destination_blob_name}")
            return blob.public_url
        except Exception as e:
            logger.error(f"Bytes upload failed: {str(e)}")
            raise
    
    def download_file(self, source_blob_name: str, destination_file_path: str):
        """
        Download a file from GCS.
        
        Args:
            source_blob_name: Source path in GCS bucket
            destination_file_path: Local destination path
        """
        try:
            blob = self.bucket.blob(source_blob_name)
            blob.download_to_filename(destination_file_path)
            
            logger.info(f"File downloaded: gs://{self.bucket_name}/{source_blob_name} -> {destination_file_path}")
        except Exception as e:
            logger.error(f"File download failed: {str(e)}")
            raise
    
    def download_bytes(self, source_blob_name: str) -> bytes:
        """
        Download file content as bytes.
        
        Args:
            source_blob_name: Source path in GCS bucket
        
        Returns:
            File content as bytes
        """
        try:
            blob = self.bucket.blob(source_blob_name)
            content = blob.download_as_bytes()
            
            logger.info(f"Bytes downloaded from: gs://{self.bucket_name}/{source_blob_name}")
            return content
        except Exception as e:
            logger.error(f"Bytes download failed: {str(e)}")
            raise
    
    def delete_file(self, blob_name: str):
        """
        Delete a file from GCS.
        
        Args:
            blob_name: Path of the file in GCS bucket
        """
        try:
            blob = self.bucket.blob(blob_name)
            blob.delete()
            
            logger.info(f"File deleted: gs://{self.bucket_name}/{blob_name}")
        except Exception as e:
            logger.error(f"File deletion failed: {str(e)}")
            raise
    
    def list_files(self, prefix: str = None) -> list:
        """
        List files in the bucket.
        
        Args:
            prefix: Filter results to objects whose names begin with this prefix
        
        Returns:
            List of blob names
        """
        try:
            blobs = self.storage_client.list_blobs(self.bucket_name, prefix=prefix)
            blob_names = [blob.name for blob in blobs]
            
            logger.info(f"Listed {len(blob_names)} files from bucket: {self.bucket_name}")
            return blob_names
        except Exception as e:
            logger.error(f"Failed to list files: {str(e)}")
            raise


class ADCValidator:
    """Validator for Application Default Credentials configuration."""
    
    @staticmethod
    def validate_adc():
        """
        Validate that Application Default Credentials are properly configured.
        
        Returns:
            Tuple of (is_valid, message)
        """
        try:
            # Try to get default credentials
            credentials, project = default()
            
            if credentials:
                logger.info(f"✓ ADC validated successfully. Project: {project}")
                return True, f"ADC valid. Project: {project}"
            else:
                logger.warning("✗ No credentials found")
                return False, "No credentials found"
                
        except Exception as e:
            logger.error(f"✗ ADC validation failed: {str(e)}")
            return False, f"ADC validation failed: {str(e)}"
    
    @staticmethod
    def get_adc_info() -> Dict[str, Any]:
        """
        Get detailed information about current ADC configuration.
        
        Returns:
            Dictionary with ADC information
        """
        info = {
            "adc_file_env": os.getenv('GOOGLE_APPLICATION_CREDENTIALS'),
            "project_id_env": os.getenv('GCP_PROJECT_ID'),
            "valid": False,
            "project": None,
            "error": None
        }
        
        try:
            credentials, project = default()
            info["valid"] = True
            info["project"] = project
            
            # Check credential type
            if hasattr(credentials, 'service_account_email'):
                info["type"] = "service_account"
                info["service_account"] = credentials.service_account_email
            elif hasattr(credentials, '_source_credentials'):
                info["type"] = "impersonated_service_account"
            else:
                info["type"] = "user_credentials"
                
        except Exception as e:
            info["error"] = str(e)
        
        return info


# Convenience functions for quick access
def get_secret(secret_id: str, project_id: Optional[str] = None) -> str:
    """
    Quick function to retrieve a secret.
    
    Args:
        secret_id: The ID of the secret
        project_id: GCP project ID (optional)
    
    Returns:
        The secret value
    """
    manager = GCPSecretManager(project_id)
    try:
        return manager.get_secret(secret_id)
    finally:
        manager.close()


def validate_gcp_credentials() -> bool:
    """
    Quick function to validate GCP credentials.
    
    Returns:
        True if credentials are valid, False otherwise
    """
    is_valid, message = ADCValidator.validate_adc()
    logger.info(message)
    return is_valid
