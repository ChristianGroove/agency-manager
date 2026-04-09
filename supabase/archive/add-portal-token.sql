-- Add portal_token column to clients table
ALTER TABLE clients 
ADD COLUMN portal_token uuid DEFAULT gen_random_uuid();

-- Create unique index on portal_token for fast lookups
CREATE UNIQUE INDEX idx_clients_portal_token ON clients(portal_token);

-- Update RLS policies to allow public access via token (if needed, or handle via service role)
-- For now, we will use a secure service function or specific RLS if we want to query directly from client.
-- Since this is a public portal, we might need a function to get client by token securely without exposing all clients.

CREATE OR REPLACE FUNCTION get_client_by_token(token_input uuid)
RETURNS TABLE (
    id uuid,
    name text,
    company_name text,
    email text,
    portal_token uuid
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.name, c.company_name, c.email, c.portal_token
    FROM clients c
    WHERE c.portal_token = token_input;
END;
$$ LANGUAGE plpgsql;
