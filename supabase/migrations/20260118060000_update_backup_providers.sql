-- MIGRATION: 20260118060000_update_backup_providers.sql
-- OBJECTIVE: Add Schedule/Frequency options to Backup Providers

-- Update AWS S3 Schema
UPDATE public.integration_providers
SET config_schema = '{
    "type": "object",
    "required": ["bucket", "region", "access_key", "secret_key", "schedule"],
    "properties": {
        "bucket": { "type": "string", "title": "S3 Bucket Name" },
        "region": { "type": "string", "title": "Region (e.g. us-east-1)" },
        "access_key": { "type": "string", "title": "Access Key ID" },
        "secret_key": { "type": "string", "title": "Secret Access Key", "format": "password" },
        "schedule": { 
            "type": "string", 
            "title": "Frecuencia de Respaldo", 
            "enum": ["daily", "weekly", "manual_only"],
            "default": "daily",
            "description": "Diario: 00:00 UTC. Semanal: Lunes 00:00 UTC."
        }
    }
}'::jsonb
WHERE key = 'aws_s3';

-- Update Google Drive Schema
UPDATE public.integration_providers
SET config_schema = '{
    "type": "object",
    "required": ["client_email", "private_key", "folder_id", "schedule"],
    "properties": {
        "client_email": { "type": "string", "title": "Service Account Email" },
        "private_key": { "type": "string", "title": "Private Key (PEM)", "format": "textarea" },
        "folder_id": { "type": "string", "title": "Target Folder ID" },
        "schedule": { 
            "type": "string", 
            "title": "Frecuencia de Respaldo", 
            "enum": ["daily", "weekly", "manual_only"],
            "default": "daily",
            "description": "Diario: 00:00 UTC. Semanal: Lunes 00:00 UTC."
        }
    }
}'::jsonb
WHERE key = 'google_drive';
