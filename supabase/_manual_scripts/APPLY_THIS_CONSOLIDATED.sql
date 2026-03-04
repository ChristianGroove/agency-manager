-- ============================================================================
-- CONSOLIDATED MIGRATION: AI Features + Assignment System
-- ============================================================================
-- Execute este archivo completo en: 
-- https://supabase.com/dashboard/project/amwlwmkejdjskukdfwut/sql
--
-- Este archivo incluye TODAS las features nuevas:
-- ✅ Intelligent Assignment System
-- ✅ Smart Replies (AI)
-- ✅ Sentiment Analysis
-- ✅ Intent Detection
-- ============================================================================

-- ============================================================================
-- PART 1: ASSIGNMENT SYSTEM TABLES
-- ============================================================================

-- Assignment rules configuration
CREATE TABLE IF NOT EXISTS public.assignment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
    strategy TEXT NOT NULL CHECK (strategy IN ('round-robin', 'load-balance', 'skills-based', 'specific-agent')),
    assign_to UUID[],
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent availability and capacity management
CREATE TABLE IF NOT EXISTS public.agent_availability (
    agent_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline', 'busy')),
    max_capacity INTEGER DEFAULT 20,
    current_load INTEGER DEFAULT 0,
    auto_assign_enabled BOOLEAN DEFAULT true,
    timezone TEXT DEFAULT 'UTC',
    work_schedule JSONB DEFAULT '{}'::jsonb,
    last_seen TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent skills for skills-based routing
CREATE TABLE IF NOT EXISTS public.agent_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    proficiency_level INTEGER DEFAULT 1 CHECK (proficiency_level BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(agent_id, skill_name)
);

-- Assignment history for analytics
CREATE TABLE IF NOT EXISTS public.assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    assigned_from UUID REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id),
    assignment_method TEXT CHECK (assignment_method IN ('manual', 'auto', 'reassign')),
    rule_id UUID REFERENCES public.assignment_rules(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PART 2: AI FEATURES TABLES
-- ============================================================================

-- AI Smart Replies
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    suggested_responses JSONB NOT NULL DEFAULT '[]'::jsonb,
    selected_response TEXT,
    was_edited BOOLEAN DEFAULT false,
    final_message TEXT,
    model_used TEXT DEFAULT 'gpt-4',
    generation_time_ms INTEGER,
    context_messages_count INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT now(),
    used_at TIMESTAMPTZ
);

-- Sentiment Analysis - Add columns to messages
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'sentiment') THEN
        ALTER TABLE public.messages 
            ADD COLUMN sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'urgent')),
            ADD COLUMN sentiment_score FLOAT CHECK (sentiment_score >= -1.0 AND sentiment_score <= 1.0),
            ADD COLUMN detected_emotions JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Sentiment Analysis - Add columns to conversations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'conversations' AND column_name = 'overall_sentiment') THEN
        ALTER TABLE public.conversations
            ADD COLUMN overall_sentiment TEXT CHECK (overall_sentiment IN ('positive', 'neutral', 'negative', 'urgent')),
            ADD COLUMN sentiment_trend JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Sentiment Alerts
CREATE TABLE IF NOT EXISTS public.sentiment_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('negative_spike', 'urgent_keywords', 'escalation_needed')),
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    sentiment_score FLOAT,
    detected_keywords TEXT[],
    auto_escalated BOOLEAN DEFAULT false,
    escalated_to UUID REFERENCES auth.users(id),
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Intent Detection
CREATE TABLE IF NOT EXISTS public.conversation_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    intent TEXT NOT NULL,
    confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    extracted_entities JSONB DEFAULT '{}'::jsonb,
    suggested_team TEXT,
    suggested_agent_skills TEXT[],
    auto_routed BOOLEAN DEFAULT false,
    model_used TEXT DEFAULT 'gpt-3.5-turbo',
    processing_time_ms INTEGER,
    detected_at TIMESTAMPTZ DEFAULT now()
);

-- Intent Routing Rules
CREATE TABLE IF NOT EXISTS public.intent_routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    intent TEXT NOT NULL,
    min_confidence FLOAT DEFAULT 0.7,
    auto_assign_to_team TEXT,
    required_skills TEXT[],
    add_tags TEXT[],
    set_priority TEXT CHECK (set_priority IN ('urgent', 'high', 'normal', 'low')),
    trigger_workflow_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PART 3: INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_assignment_rules_org ON public.assignment_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_active ON public.assignment_rules(is_active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_agent_availability_status ON public.agent_availability(status) WHERE status IN ('online', 'away');
CREATE INDEX IF NOT EXISTS idx_agent_skills_agent ON public.agent_skills(agent_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_conversation ON public.assignment_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_conversation ON public.ai_suggestions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sentiment ON public.messages(sentiment, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_conversation ON public.sentiment_alerts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_intents_conversation ON public.conversation_intents(conversation_id);
CREATE INDEX IF NOT EXISTS idx_intents_intent ON public.conversation_intents(intent, detected_at DESC);

-- ============================================================================
-- PART 4: RLS POLICIES
-- ============================================================================

-- Assignment Rules
ALTER TABLE public.assignment_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their org assignment rules" ON public.assignment_rules;
CREATE POLICY "Users can view their org assignment rules" ON public.assignment_rules FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Agent Availability  
ALTER TABLE public.agent_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view all agents" ON public.agent_availability;
CREATE POLICY "Users can view all agents" ON public.agent_availability FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own availability" ON public.agent_availability;
CREATE POLICY "Users can update their own availability" ON public.agent_availability FOR ALL
    USING (agent_id = auth.uid());

-- AI Suggestions
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view AI suggestions for their org conversations" ON public.ai_suggestions;
CREATE POLICY "Users can view AI suggestions for their org conversations" ON public.ai_suggestions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = ai_suggestions.conversation_id
        AND c.organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    ));

-- Sentiment Alerts
ALTER TABLE public.sentiment_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view sentiment alerts for their org" ON public.sentiment_alerts;
CREATE POLICY "Users can view sentiment alerts for their org" ON public.sentiment_alerts FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = sentiment_alerts.conversation_id
        AND c.organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    ));

-- Conversation Intents
ALTER TABLE public.conversation_intents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view intents for their org conversations" ON public.conversation_intents;
CREATE POLICY "Users can view intents for their org conversations" ON public.conversation_intents FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_intents.conversation_id
        AND c.organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    ));

-- Intent Routing Rules
ALTER TABLE public.intent_routing_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their org routing rules" ON public.intent_routing_rules;
CREATE POLICY "Users can view their org routing rules" ON public.intent_routing_rules FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- ============================================================================
-- PART 5: FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to increment agent load
CREATE OR REPLACE FUNCTION increment_agent_load(p_agent_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.agent_availability
    SET current_load = current_load + 1, updated_at = NOW()
    WHERE agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement agent load
CREATE OR REPLACE FUNCTION decrement_agent_load(p_agent_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.agent_availability
    SET current_load = GREATEST(current_load - 1, 0), updated_at = NOW()
    WHERE agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to update agent load
CREATE OR REPLACE FUNCTION update_agent_load_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL THEN
        PERFORM increment_agent_load(NEW.assigned_to);
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
            IF OLD.assigned_to IS NOT NULL THEN
                PERFORM decrement_agent_load(OLD.assigned_to);
            END IF;
            IF NEW.assigned_to IS NOT NULL THEN
                PERFORM increment_agent_load(NEW.assigned_to);
            END IF;
        END IF;
        
        IF NEW.state = 'archived' AND OLD.state != 'archived' AND NEW.assigned_to IS NOT NULL THEN
            PERFORM decrement_agent_load(NEW.assigned_to);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger
DROP TRIGGER IF EXISTS trigger_update_agent_load ON public.conversations;
CREATE TRIGGER trigger_update_agent_load
    AFTER INSERT OR UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_load_on_assignment();

-- Function to update conversation sentiment
CREATE OR REPLACE FUNCTION update_conversation_sentiment()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET overall_sentiment = (
        SELECT 
            CASE 
                WHEN COUNT(*) FILTER (WHERE sentiment = 'urgent') > 0 THEN 'urgent'
                WHEN AVG(CASE 
                    WHEN sentiment = 'negative' THEN -1
                    WHEN sentiment = 'neutral' THEN 0
                    WHEN sentiment = 'positive' THEN 1
                    ELSE 0
                END) < -0.3 THEN 'negative'
                WHEN AVG(CASE 
                    WHEN sentiment = 'negative' THEN -1
                    WHEN sentiment = 'neutral' THEN 0
                    WHEN sentiment = 'positive' THEN 1
                    ELSE 0
                END) > 0.3 THEN 'positive'
                ELSE 'neutral'
            END
        FROM (
            SELECT sentiment 
            FROM public.messages 
            WHERE conversation_id = NEW.conversation_id 
              AND sentiment IS NOT NULL
            ORDER BY created_at DESC 
            LIMIT 5
        ) recent_messages
    )
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply sentiment trigger
DROP TRIGGER IF EXISTS trigger_update_conversation_sentiment ON public.messages;
CREATE TRIGGER trigger_update_conversation_sentiment
    AFTER INSERT OR UPDATE OF sentiment
    ON public.messages
    FOR EACH ROW
    WHEN (NEW.sentiment IS NOT NULL)
    EXECUTE FUNCTION update_conversation_sentiment();

-- ============================================================================
-- PART 6: ENABLE REALTIME
-- ============================================================================

DO $$
BEGIN
    -- Enable realtime for new tables
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'agent_availability') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_availability;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'assignment_rules') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.assignment_rules;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ai_suggestions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_suggestions;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sentiment_alerts') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sentiment_alerts;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_intents') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_intents;
    END IF;
END $$;

-- ============================================================================
-- DONE! ✅
-- ============================================================================
-- Todas las features están ahora instaladas:
-- ✅ Assignment System (agent availability, rules, skills, history)
-- ✅ Smart Replies (AI suggestions tracking)
-- ✅ Sentiment Analysis (message sentiment + alerts)
-- ✅ Intent Detection (auto-routing rules)
--
-- Next steps:
-- 1. Agregar OPENAI_API_KEY a .env.local
-- 2. Refrescar el inbox (F5)
-- 3. Enviar un mensaje de prueba
-- ============================================================================
