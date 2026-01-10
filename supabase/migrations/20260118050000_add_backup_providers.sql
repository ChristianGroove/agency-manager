-- MIGRATION: 20260118050000_add_backup_providers.sql
-- OBJECTIVE: Add Storage Providers to the Marketplace Catalog

INSERT INTO public.integration_providers (key, name, description, category, icon_url, is_premium, config_schema) VALUES
(
    'aws_s3',
    'AWS S3 Backup',
    'Automated nightly backups to your own S3 bucket.',
    'storage',
    '/icons/aws-s3.svg',
    true,
    '{
        "type": "object",
        "required": ["bucket", "region", "access_key", "secret_key"],
        "properties": {
            "bucket": { "type": "string", "title": "S3 Bucket Name" },
            "region": { "type": "string", "title": "Region (e.g. us-east-1)" },
            "access_key": { "type": "string", "title": "Access Key ID" },
            "secret_key": { "type": "string", "title": "Secret Access Key", "format": "password" }
        }
    }'::jsonb
),
(
    'google_drive',
    'Google Drive Backup',
    'Save backups to a specific Google Drive folder.',
    'storage',
    '/icons/google-drive.svg',
    true,
    '{
        "type": "object",
        "required": ["client_email", "private_key", "folder_id"],
        "properties": {
            "client_email": { "type": "string", "title": "Service Account Email" },
            "private_key": { "type": "string", "title": "Private Key (PEM)", "format": "textarea" },
            "folder_id": { "type": "string", "title": "Target Folder ID" }
        }
    }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET
    config_schema = EXCLUDED.config_schema,
    category = EXCLUDED.category;
