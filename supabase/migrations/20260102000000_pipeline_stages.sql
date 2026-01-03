-- Pipeline Stages Configuration Table
-- Allows each organization to define custom CRM pipeline stages

-- Create pipeline_stages table
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status_key TEXT NOT NULL, -- 'open', 'contacted', 'won', 'lost', etc.
    display_order INTEGER NOT NULL DEFAULT 0,
    color TEXT DEFAULT 'bg-gray-500', -- Tailwind class for stage color
    icon TEXT DEFAULT 'circle', -- Icon identifier
    is_active BOOLEAN DEFAULT true,
    is_final BOOLEAN DEFAULT false, -- If true, leads in this stage are considered closed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, status_key)
);

-- Add index for fast lookups (safe to re-run)
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_org ON public.pipeline_stages(organization_id) WHERE is_active = true;

-- RLS Policies (safe to re-run with DROP IF EXISTS)
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org's pipeline stages" ON public.pipeline_stages;
CREATE POLICY "Users can view their org's pipeline stages"
    ON public.pipeline_stages
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage their org's pipeline stages" ON public.pipeline_stages;
CREATE POLICY "Admins can manage their org's pipeline stages"
    ON public.pipeline_stages
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Seed default pipeline stages for existing organizations
INSERT INTO public.pipeline_stages (organization_id, name, status_key, display_order, color, icon, is_final)
SELECT 
    id as organization_id,
    stage_name,
    stage_key,
    stage_order,
    stage_color,
    stage_icon,
    is_final
FROM public.organizations
CROSS JOIN (
    VALUES 
        ('Nuevo', 'open', 1, 'bg-blue-500', 'plus', false),
        ('Contactado', 'contacted', 2, 'bg-purple-500', 'mail', false),
        ('Calificado', 'qualified', 3, 'bg-indigo-500', 'check-circle', false),
        ('Propuesta Enviada', 'proposal', 4, 'bg-yellow-500', 'file-text', false),
        ('Negociación', 'negotiation', 5, 'bg-orange-500', 'users', false),
        ('Ganado', 'won', 6, 'bg-green-500', 'trophy', true),
        ('Perdido', 'lost', 7, 'bg-red-500', 'x-circle', true)
) AS default_stages(stage_name, stage_key, stage_order, stage_color, stage_icon, is_final)
ON CONFLICT (organization_id, status_key) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pipeline_stages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. AUTO-CREATE PIPELINE STAGES FOR NEW ORGANIZATIONS
-- ============================================

-- Function to create default pipeline stages for a new organization
CREATE OR REPLACE FUNCTION public.create_default_pipeline_stages()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert default 7-stage pipeline for the new organization
    INSERT INTO public.pipeline_stages (organization_id, name, status_key, display_order, color, icon, is_active, is_final)
    VALUES
        (NEW.id, 'Nuevo', 'open', 1, 'bg-blue-500', 'plus', true, false),
        (NEW.id, 'Contactado', 'contacted', 2, 'bg-indigo-500', 'mail', true, false),
        (NEW.id, 'Calificado', 'qualified', 3, 'bg-purple-500', 'check-circle', true, false),
        (NEW.id, 'Propuesta Enviada', 'proposal', 4, 'bg-violet-500', 'file-text', true, false),
        (NEW.id, 'Negociación', 'negotiation', 5, 'bg-orange-500', 'users', true, false),
        (NEW.id, 'Ganado', 'won', 6, 'bg-green-500', 'trophy', true, true),
        (NEW.id, 'Perdido', 'lost', 7, 'bg-red-500', 'x-circle', true, true);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_default_pipeline_stages ON public.organizations;
-- Create trigger to auto-create pipeline stages when a new organization is created
CREATE TRIGGER trigger_create_default_pipeline_stages
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.create_default_pipeline_stages();

COMMENT ON FUNCTION public.create_default_pipeline_stages IS 'Automatically creates default 7-stage pipeline for new organizations';
COMMENT ON TRIGGER trigger_create_default_pipeline_stages ON public.organizations IS 'Auto-creates pipeline stages when organization is created';

DROP TRIGGER IF EXISTS pipeline_stages_updated_at ON public.pipeline_stages;
CREATE TRIGGER pipeline_stages_updated_at
    BEFORE UPDATE ON public.pipeline_stages
    FOR EACH ROW
    EXECUTE FUNCTION update_pipeline_stages_updated_at();
