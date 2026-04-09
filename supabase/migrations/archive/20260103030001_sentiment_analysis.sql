-- Sentiment Analysis Schema
-- Stores sentiment analysis results for messages

-- Add sentiment columns to messages table
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'urgent')),
  ADD COLUMN IF NOT EXISTS sentiment_score FLOAT CHECK (sentiment_score >= -1.0 AND sentiment_score <= 1.0),
  ADD COLUMN IF NOT EXISTS detected_emotions JSONB DEFAULT '[]'::jsonb;
  -- Format: ['happy', 'satisfied', 'frustrated', 'angry', 'confused', 'urgent']

-- Add sentiment columns to conversations table for aggregate sentiment
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS overall_sentiment TEXT CHECK (overall_sentiment IN ('positive', 'neutral', 'negative', 'urgent')),
  ADD COLUMN IF NOT EXISTS sentiment_trend JSONB DEFAULT '[]'::jsonb;
  -- Format: [{timestamp: '...', sentiment: 'positive', score: 0.8}, ...]

-- Create sentiment alerts table
CREATE TABLE IF NOT EXISTS public.sentiment_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    
    -- Alert details
    alert_type TEXT NOT NULL CHECK (alert_type IN ('negative_spike', 'urgent_keywords', 'escalation_needed')),
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    sentiment_score FLOAT,
    detected_keywords TEXT[],
    
    -- Actions taken
    auto_escalated BOOLEAN DEFAULT false,
    escalated_to UUID REFERENCES auth.users(id),
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMPTZ,
    
  resolution_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_sentiment ON public.messages(sentiment, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sentiment_score ON public.messages(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_conversations_sentiment ON public.conversations(overall_sentiment);
CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_conversation ON public.sentiment_alerts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_unacknowledged ON public.sentiment_alerts(created_at DESC) 
    WHERE acknowledged_at IS NULL;

-- RLS Policies for sentiment_alerts
ALTER TABLE public.sentiment_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sentiment alerts for their org" ON public.sentiment_alerts;
CREATE POLICY "Users can view sentiment alerts for their org"
    ON public.sentiment_alerts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = sentiment_alerts.conversation_id
            AND c.organization_id IN (
                SELECT organization_id FROM public.organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can update sentiment alerts" ON public.sentiment_alerts;
CREATE POLICY "Users can update sentiment alerts"
    ON public.sentiment_alerts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = sentiment_alerts.conversation_id
            AND c.organization_id IN (
                SELECT organization_id FROM public.organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

-- Enable realtime for alerts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'sentiment_alerts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sentiment_alerts;
    END IF;
END $$;

-- Function to update conversation sentiment
CREATE OR REPLACE FUNCTION update_conversation_sentiment()
RETURNS TRIGGER AS $$
BEGIN
    -- Update overall sentiment based on last 5 messages
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
    ),
    sentiment_trend = (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'timestamp', created_at,
                'sentiment', sentiment,
                'score', sentiment_score
            ) ORDER BY created_at DESC
        ), '[]'::jsonb)
        FROM (
            SELECT created_at, sentiment, sentiment_score
            FROM public.messages
            WHERE conversation_id = NEW.conversation_id
              AND sentiment IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 10
        ) trend_data
    )
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update conversation sentiment when message sentiment changes
DROP TRIGGER IF EXISTS trigger_update_conversation_sentiment ON public.messages;
CREATE TRIGGER trigger_update_conversation_sentiment
    AFTER INSERT OR UPDATE OF sentiment
    ON public.messages
    FOR EACH ROW
    WHEN (NEW.sentiment IS NOT NULL)
    EXECUTE FUNCTION update_conversation_sentiment();

-- Analytics view
CREATE OR REPLACE VIEW public.sentiment_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    sentiment,
    COUNT(*) as message_count,
    AVG(sentiment_score) as avg_score,
    COUNT(DISTINCT conversation_id) as unique_conversations
FROM public.messages
WHERE sentiment IS NOT NULL
GROUP BY DATE_TRUNC('day', created_at), sentiment
ORDER BY date DESC, sentiment;
