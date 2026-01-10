-- Function to find conversation by phone ignoring format
-- Normalizes both database column and input to digits only
CREATE OR REPLACE FUNCTION find_conversation_by_phone(
    p_phone text, 
    p_org_id uuid
)
RETURNS uuid AS $$
DECLARE
    v_clean_input text;
    v_result uuid;
BEGIN
    -- Remove non-digits from input
    v_clean_input := regexp_replace(p_phone, '\D', '', 'g');

    SELECT id INTO v_result
    FROM conversations
    WHERE organization_id = p_org_id
    AND state != 'archived'
    AND (
        -- Exact match of clean numbers
        regexp_replace(phone, '\D', '', 'g') = v_clean_input
        OR
        -- Handle missing 57 prefix in input (Input 300... matches DB 57300...)
        regexp_replace(phone, '\D', '', 'g') = '57' || v_clean_input
        OR
        -- Handle missing 57 prefix in DB (Input 57300... matches DB 300...)
        '57' || regexp_replace(phone, '\D', '', 'g') = v_clean_input
    )
    ORDER BY updated_at DESC
    LIMIT 1;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
