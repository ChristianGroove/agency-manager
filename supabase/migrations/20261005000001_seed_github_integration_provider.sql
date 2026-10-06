-- Seed GitHub integration provider into public.integration_providers
INSERT INTO public.integration_providers (key, name, description, category, icon_url, is_premium, is_enabled, config_schema)
VALUES (
    'github',
    'GitHub',
    'Sincronización nativa de ramas, commits y pull requests con Pixy Tasks',
    'productivity',
    '/icons/github.svg',
    false,
    true,
    '{
        "required": ["token"],
        "properties": {
            "token": { "type": "string", "title": "Personal Access Token", "description": "Token clásico con scopes repo y admin:org_hook, o Fine-grained token", "format": "password" },
            "owner": { "type": "string", "title": "Owner / Organización (Opcional)", "description": "Usuario u organización de GitHub por defecto (ej: mi-agencia)" },
            "webhook_secret": { "type": "string", "title": "Webhook Secret (Opcional)", "description": "Clave secreta HMAC-SHA256 para validación criptográfica de webhooks", "format": "password" }
        }
    }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    config_schema = EXCLUDED.config_schema,
    is_enabled = true;
