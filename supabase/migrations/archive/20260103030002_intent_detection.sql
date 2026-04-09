-- Intent Detection Schema
-- Detects customer intent and enables smart routing

CREATE TABLE IF NOT EXISTS public.conversation_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    
    -- Intent classification
    intent TEXT NOT NULL,
    -- Common intents: billing_inquiry, technical_support, sales_question, 
    --                 complaint, feature_request, general_inquiry, order_status
    confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Extracted entities
    extracted_entities JSONB DEFAULT '{}'::jsonb,
    -- Format: {product: 'Premium Plan', amount: '$99', order_id: '12345'}
    
    -- Routing suggestions
    suggested_team TEXT, -- 'sales', 'support', 'billing', 'product'
    suggested_agent_skills TEXT[], -- ['billing', 'refunds']
    auto_routed BOOLEAN DEFAULT false,
    
    -- Metadata
    model_used TEXT DEFAULT 'gpt-3.5-turbo',
    processing_time_ms INTEGER,
    
    detected_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_intents_conversation ON public.conversation_intents(conversation_id);
CREATE INDEX IF NOT EXISTS idx_intents_intent ON public.conversation_intents(intent, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_intents_confidence ON public.conversation_intents(confidence DESC);

-- RLS Policies
ALTER TABLE public.conversation_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view intents for their org conversations" ON public.conversation_intents;
CREATE POLICY "Users can view intents for their org conversations"
    ON public.conversation_intents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_intents.conversation_id
            AND c.organization_id IN (
                SELECT organization_id FROM public.organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "System can create intents" ON public.conversation_intents;
CREATE POLICY "System can create intents"
    ON public.conversation_intents FOR INSERT
    WITH CHECK (true); -- Allow service role to insert

-- Enable realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'conversation_intents'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_intents;
    END IF;
END $$;

-- Intent routing rules table
CREATE TABLE IF NOT EXISTS public.intent_routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Rule configuration
    intent TEXT NOT NULL,
    min_confidence FLOAT DEFAULT 0.7,
    
    -- Routing action
    auto_assign_to_team TEXT, -- 'sales', 'support', 'billing'
    required_skills TEXT[],
    add_tags TEXT[],
    set_priority TEXT CHECK (set_priority IN ('urgent', 'high', 'normal', 'low')),
    
    -- Automation triggers
    trigger_workflow_id UUID, -- Link to automation workflow
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Default intent routing rules (insert after organization creation)
INSERT INTO public.intent_routing_rules (
    organization_id, intent, min_confidence, add_tags, set_priority
) 
SELECT 
    id,
    'billing_inquiry',
    0.7,
    ARRAY['billing'],
    'high'
FROM public.organizations
WHERE NOT EXISTS (
    SELECT 1 FROM public.intent_routing_rules 
    WHERE organization_id = organizations.id 
    AND intent = 'billing_inquiry'
)
LIMIT 5; -- Limit to avoid spam on existing orgs

INSERT INTO public.intent_routing_rules (
    organization_id, intent, min_confidence, add_tags, set_priority
)
SELECT 
    id,
    'complaint',
    0.7,
    ARRAY['complaint', 'escalated'],
    'urgent'
FROM public.organizations
WHERE NOT EXISTS (
    SELECT 1 FROM public.intent_routing_rules 
    WHERE organization_id = organizations.id 
    AND intent = 'complaint'
)
LIMIT 5;

-- RLS for routing rules
ALTER TABLE public.intent_routing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org routing rules" ON public.intent_routing_rules;
CREATE POLICY "Users can view their org routing rules"
    ON public.intent_routing_rules FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage their org routing rules" ON public.intent_routing_rules;
CREATE POLICY "Users can manage their org routing rules"
    ON public.intent_routing_rules FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Analytics view
CREATE OR REPLACE VIEW public.intent_analytics AS
SELECT 
    intent,
    COUNT(*) as total_detected,
    AVG(confidence) as avg_confidence,
    COUNT(CASE WHEN auto_routed = true THEN 1 END) as auto_routed_count,
    DATE_TRUNC('day', detected_at) as date
FROM public.conversation_intents
GROUP BY intent, DATE_TRUNC('day', detected_at)
ORDER BY date DESC, total_detected DESC;
