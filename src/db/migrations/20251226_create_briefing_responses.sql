-- Migration: Create briefing_responses table
-- This table stores client responses to briefing questions

-- Create briefing_responses table
CREATE TABLE IF NOT EXISTS briefing_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    briefing_id UUID NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
    field_id TEXT NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(briefing_id, field_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_briefing_responses_briefing_id ON briefing_responses(briefing_id);

-- Enable RLS
ALTER TABLE briefing_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view responses for their own briefings
CREATE POLICY "Users can view their own briefing responses"
    ON briefing_responses
    FOR SELECT
    USING (
        briefing_id IN (
            SELECT id FROM briefings WHERE client_id IN (
                SELECT id FROM clients WHERE user_id = auth.uid()
            )
        )
    );

-- Policy: Users can insert/update responses for their own briefings
CREATE POLICY "Users can manage their own briefing responses"
    ON briefing_responses
    FOR ALL
    USING (
        briefing_id IN (
            SELECT id FROM briefings WHERE client_id IN (
                SELECT id FROM clients WHERE user_id = auth.uid()
            )
        )
    );

-- Policy: Service role can do everything (for admin dashboard)
CREATE POLICY "Service role full access to briefing_responses"
    ON briefing_responses
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_briefing_response_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_briefing_responses_updated_at ON briefing_responses;

-- Create trigger
CREATE TRIGGER update_briefing_responses_updated_at
    BEFORE UPDATE ON briefing_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_briefing_response_updated_at();
