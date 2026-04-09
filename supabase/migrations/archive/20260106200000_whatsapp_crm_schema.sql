-- ============================================
-- WhatsApp CRM Enhancements
-- Date: 2026-01-06
-- Description: Adds CRM capabilities to integration connections (routing, scheduling, pipelines)
-- ============================================

-- 1. Add CRM columns to integration_connections
ALTER TABLE public.integration_connections ADD COLUMN IF NOT EXISTS default_pipeline_stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL;
ALTER TABLE public.integration_connections ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{"enabled": false}'::jsonb;
ALTER TABLE public.integration_connections ADD COLUMN IF NOT EXISTS auto_reply_when_offline TEXT;
ALTER TABLE public.integration_connections ADD COLUMN IF NOT EXISTS welcome_message TEXT;
ALTER TABLE public.integration_connections ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- 2. Ensure only one primary connection per provider per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_connections_primary 
ON public.integration_connections (organization_id, provider_key) 
WHERE is_primary = true;

-- 3. Comments for documentation
COMMENT ON COLUMN public.integration_connections.default_pipeline_stage_id IS 'Auto-create deals in this stage for new contacts from this channel';
COMMENT ON COLUMN public.integration_connections.working_hours IS 'Schedule configuration for auto-replies';
COMMENT ON COLUMN public.integration_connections.is_primary IS 'If true, this line is used for default outbound messages';
