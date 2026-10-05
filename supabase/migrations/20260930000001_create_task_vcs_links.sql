-- Migration: 20260930000001_create_task_vcs_links.sql
-- Description: Universal VCS (Bitbucket/GitHub/GitLab) integration layer for Pixy Tasks

-- 1. Create task_vcs_links table
CREATE TABLE IF NOT EXISTS public.task_vcs_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.task_items(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('bitbucket', 'github', 'gitlab')),
    resource_type TEXT NOT NULL CHECK (resource_type IN ('branch', 'pull_request', 'commit')),
    external_id TEXT NOT NULL,
    repository_name TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    status TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_task_vcs_resource UNIQUE(task_id, provider, resource_type, external_id)
);

-- 2. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_task_vcs_links_task_id ON public.task_vcs_links(task_id);
CREATE INDEX IF NOT EXISTS idx_task_vcs_links_org_id ON public.task_vcs_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_vcs_links_repo ON public.task_vcs_links(repository_name);
CREATE INDEX IF NOT EXISTS idx_task_vcs_links_ext_id ON public.task_vcs_links(provider, external_id);

-- 3. Row Level Security
ALTER TABLE public.task_vcs_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_manage_task_vcs_links" ON public.task_vcs_links;
CREATE POLICY "tenant_manage_task_vcs_links" ON public.task_vcs_links
    FOR ALL TO authenticated
    USING (organization_id IN (
        SELECT om.organization_id FROM public.organization_members om
        WHERE om.user_id = auth.uid()
    ))
    WITH CHECK (organization_id IN (
        SELECT om.organization_id FROM public.organization_members om
        WHERE om.user_id = auth.uid()
    ));

GRANT ALL ON TABLE public.task_vcs_links TO authenticated;
GRANT ALL ON TABLE public.task_vcs_links TO service_role;

-- 4. Register Bitbucket in integration_providers catalog
INSERT INTO public.integration_providers (key, name, description, category, icon_url, is_premium, is_enabled, config_schema)
VALUES (
    'bitbucket',
    'Bitbucket',
    'Sincronización nativa de ramas, commits y pull requests con Pixy Tasks',
    'productivity',
    '/icons/bitbucket.svg',
    false,
    true,
    '{
        "required": ["workspace", "token"],
        "properties": {
            "workspace": { "type": "string", "title": "Bitbucket Workspace Slug", "description": "Slug del workspace en Bitbucket (ej: mi-agencia)" },
            "token": { "type": "string", "title": "Workspace Access Token", "description": "Token con permisos de lectura de repositorios, webhooks y pull requests", "format": "password" },
            "webhook_secret": { "type": "string", "title": "Webhook Secret (Opcional)", "description": "Clave secreta HMAC-SHA256 para validación criptográfica de webhooks", "format": "password" }
        }
    }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    config_schema = EXCLUDED.config_schema,
    is_enabled = true;
