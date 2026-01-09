-- Create quote_settings table for Smart Quote Customization

CREATE TABLE IF NOT EXISTS public.quote_settings (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    vertical TEXT CHECK (vertical IN ('agency', 'ecommerce', 'reservation', 'custom')) DEFAULT 'custom',
    
    -- Action Labels and Configs
    approve_label TEXT DEFAULT '✅ Aprobar Presupuesto',
    reject_label TEXT DEFAULT '❌ Rechazar / Cambios',
    
    -- Logic Mapping (JSONB for flexibility)
    actions_config JSONB DEFAULT '{
        "approve": {
            "move_to_stage": "won",
            "notify_team": true,
            "send_message": true
        },
        "reject": {
            "ask_reason": true,
            "reasons": ["Precio Alto", "Alcance Incorrecto", "Eligió Competencia", "Otro"]
        }
    }'::jsonb,
    
    -- Template Config
    template_config JSONB DEFAULT '{
        "header": "COTIZACIÓN FORMAL",
        "footer": "Gracias por su confianza."
    }'::jsonb,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.quote_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Own Settings" ON public.quote_settings
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Update Own Settings" ON public.quote_settings
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Insert Own Settings" ON public.quote_settings
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Create trigger to update updated_at
CREATE TRIGGER update_quote_settings_updated_at
    BEFORE UPDATE ON public.quote_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.quote_settings TO postgres;
GRANT ALL ON public.quote_settings TO authenticated;
GRANT ALL ON public.quote_settings TO service_role;

-- Reload Schema Cache
NOTIFY pgrst, 'reload config';
