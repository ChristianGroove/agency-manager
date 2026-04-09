-- Function to generate random alphanumeric token
CREATE OR REPLACE FUNCTION generate_short_token(length integer DEFAULT 6) RETURNS text AS $$
DECLARE
  chars text[] := '{0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z}';
  result text := '';
  i integer := 0;
BEGIN
  FOR i IN 1..length LOOP
    result := result || chars[1+floor(random()*array_length(chars, 1))];
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add new columns
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS portal_short_token text,
ADD COLUMN IF NOT EXISTS portal_token_created_at timestamp with time zone DEFAULT now();

-- Backfill existing clients with unique tokens
DO $$
DECLARE
  client_record RECORD;
  new_token text;
  done bool;
BEGIN
  FOR client_record IN SELECT id FROM clients WHERE portal_short_token IS NULL LOOP
    done := false;
    WHILE NOT done LOOP
      new_token := generate_short_token(6);
      BEGIN
        UPDATE clients SET portal_short_token = new_token WHERE id = client_record.id;
        done := true;
      EXCEPTION WHEN unique_violation THEN
        -- Token exists, try again
      END;
    END LOOP;
  END LOOP;
END $$;

-- Add unique constraint/index
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_portal_short_token ON clients(portal_short_token);

-- Update RLS or Functions if necessary
-- (Assuming get_client_by_token needs update or we create a new one)

CREATE OR REPLACE FUNCTION get_client_by_short_token(token_input text)
RETURNS TABLE (
    id uuid,
    name text,
    company_name text,
    email text,
    portal_short_token text,
    portal_token uuid
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.name, c.company_name, c.email, c.portal_short_token, c.portal_token
    FROM clients c
    WHERE c.portal_short_token = token_input;
END;
$$ LANGUAGE plpgsql;
