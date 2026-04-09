-- Smart Reply Suggestions Schema
-- Stores AI-generated response suggestions for messages

CREATE TABLE IF NOT EXISTS public.ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    
    -- Suggested responses
    suggested_responses JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Format: [
    --   {type: 'short', text: 'Quick reply...', tokens: 10},
    --   {type: 'medium', text: 'Detailed reply...', tokens: 50},
    --   {type: 'detailed', text: 'Comprehensive reply...', tokens: 150}
    -- ]
    
    -- User interaction
    selected_response TEXT, -- Which suggestion was used (if any)
    was_edited BOOLEAN DEFAULT false, -- Did user edit before sending?
    final_message TEXT, -- Actual message sent
    
    -- Metadata
    model_used TEXT DEFAULT 'gpt-4', -- AI model
    generation_time_ms INTEGER, -- How long it took
    context_messages_count INTEGER DEFAULT 5, -- How many previous messages used
    
    created_at TIMESTAMPTZ DEFAULT now(),
    used_at TIMESTAMPTZ -- When user selected/sent
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_conversation ON public.ai_suggestions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_message ON public.ai_suggestions(message_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_created ON public.ai_suggestions(created_at DESC);

-- RLS Policies
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view AI suggestions for their org conversations" ON public.ai_suggestions;
CREATE POLICY "Users can view AI suggestions for their org conversations"
    ON public.ai_suggestions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = ai_suggestions.conversation_id
            AND c.organization_id IN (
                SELECT organization_id FROM public.organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can create AI suggestions for their org conversations" ON public.ai_suggestions;
CREATE POLICY "Users can create AI suggestions for their org conversations"
    ON public.ai_suggestions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = ai_suggestions.conversation_id
            AND c.organization_id IN (
                SELECT organization_id FROM public.organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can update their AI suggestions" ON public.ai_suggestions;
CREATE POLICY "Users can update their AI suggestions"
    ON public.ai_suggestions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = ai_suggestions.conversation_id
            AND c.organization_id IN (
                SELECT organization_id FROM public.organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

-- Enable realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'ai_suggestions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_suggestions;
    END IF;
END $$;

-- Analytics view for measuring effectiveness
CREATE OR REPLACE VIEW public.ai_suggestion_analytics AS
SELECT 
    COUNT(*) as total_suggestions,
    COUNT(selected_response) as times_used,
    ROUND(COUNT(selected_response)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as usage_rate,
    AVG(generation_time_ms) as avg_generation_time_ms,
    COUNT(CASE WHEN was_edited = false THEN 1 END) as used_without_edit,
    model_used,
    DATE_TRUNC('day', created_at) as date
FROM public.ai_suggestions
GROUP BY model_used, DATE_TRUNC('day', created_at)
ORDER BY date DESC;
