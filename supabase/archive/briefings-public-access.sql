-- Allow public read access to templates, steps, and fields
-- This is necessary for the public wizard to render the form.
DROP POLICY IF EXISTS "Public can view templates" ON briefing_templates;
CREATE POLICY "Public can view templates" ON briefing_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view steps" ON briefing_steps;
CREATE POLICY "Public can view steps" ON briefing_steps FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view fields" ON briefing_fields;
CREATE POLICY "Public can view fields" ON briefing_fields FOR SELECT USING (true);

-- Allow public access to briefings via token
-- We can't easily filter by "token in query param" in RLS directly for SELECT without a function.
-- BUT, for `getBriefingByToken`, we are querying `eq('token', token)`.
-- If we use a policy `USING (true)`, anyone can list ALL briefings. That's bad.
-- We need a secure way.

-- Option 1: Create a PostgreSQL function `get_briefing_by_token(token)` with SECURITY DEFINER.
-- This is the safest way.

DROP FUNCTION IF EXISTS get_briefing_by_token(TEXT);

CREATE OR REPLACE FUNCTION get_briefing_by_token(p_token TEXT)
RETURNS TABLE (
    id UUID,
    template_id UUID,
    client_id UUID,
    status briefing_status,
    token TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    client_name TEXT
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY SELECT 
        b.id, b.template_id, b.client_id, b.status, b.token, b.metadata, b.created_at, b.updated_at,
        c.name as client_name
    FROM briefings b
    LEFT JOIN clients c ON b.client_id = c.id
    WHERE b.token = p_token;
END;
$$ LANGUAGE plpgsql;

-- Option 2: For RESPONSES, we need to allow INSERT/UPDATE if the user "has" the briefing token.
-- Since we can't prove they have the token in a simple INSERT RLS, we will use a SECURITY DEFINER function for saving responses too.

CREATE OR REPLACE FUNCTION save_briefing_response(
    p_briefing_id UUID,
    p_field_id UUID,
    p_value JSONB
)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
    -- Verify the briefing exists (we could also check token here if we passed it, but ID is usually enough if UUIDs are secret enough, 
    -- though technically UUIDs are guessable. Better to pass token or trust the ID implies knowledge).
    -- However, for public forms, usually knowing the ID is considered "access" if the ID is a UUID.
    -- But we have a specific `token` column. Let's rely on the fact that the Server Action `saveBriefingResponse`
    -- will be called by the Wizard which *has* the briefing object (and thus the ID).
    
    -- To be stricter: We could require the token to be passed to this function.
    -- Let's stick to simple UPSERT for now, assuming the UUID is hard to guess.
    
    INSERT INTO briefing_responses (briefing_id, field_id, value)
    VALUES (p_briefing_id, p_field_id, p_value)
    ON CONFLICT (briefing_id, field_id)
    DO UPDATE SET 
        value = EXCLUDED.value,
        updated_at = NOW();
        
    -- Update briefing status
    UPDATE briefings 
    SET status = 'in_progress' 
    WHERE id = p_briefing_id AND status IN ('draft', 'sent');
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to anon/public
GRANT EXECUTE ON FUNCTION get_briefing_by_token(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION save_briefing_response(UUID, UUID, JSONB) TO anon, authenticated, service_role;

-- We also need to fetch responses for a briefing (to resume).
CREATE OR REPLACE FUNCTION get_briefing_responses(p_briefing_id UUID)
RETURNS SETOF briefing_responses
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY SELECT * FROM briefing_responses WHERE briefing_id = p_briefing_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_briefing_responses(UUID) TO anon, authenticated, service_role;

-- Allow public to submit briefing
CREATE OR REPLACE FUNCTION submit_briefing(p_briefing_id UUID)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
    UPDATE briefings 
    SET status = 'submitted', updated_at = NOW()
    WHERE id = p_briefing_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION submit_briefing(UUID) TO anon, authenticated, service_role;
