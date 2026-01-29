const { Client } = require('pg');

async function recoverBriefings() {
    // Credentials from seed_operational_tables.js
    const pid = 'uqnsdylhyenfmfkxmkrn';
    const pass = 'Valentinfer1987*';
    const r = 'us-west-2';

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    try {
        console.log('Connecting to Supabase Sandbox...');
        await client.connect();

        const sql = `
        -- 1. Create briefings table
        CREATE TABLE IF NOT EXISTS public.briefings (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            deleted_at TIMESTAMPTZ,
            organization_id UUID NOT NULL, 
            template_id UUID NOT NULL REFERENCES public.briefing_templates(id),
            client_id UUID REFERENCES public.clients(id),
            service_id UUID,
            status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'in_progress', 'submitted', 'locked')),
            token TEXT DEFAULT encode(gen_random_bytes(32), 'hex') UNIQUE, 
            metadata JSONB DEFAULT '{}'::jsonb
        );
    
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    
        DROP TRIGGER IF EXISTS update_briefings_updated_at ON public.briefings;
        CREATE TRIGGER update_briefings_updated_at
            BEFORE UPDATE ON public.briefings
            FOR EACH ROW
            EXECUTE PROCEDURE update_updated_at_column();
    
        ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
    
        DROP POLICY IF EXISTS "Enable all access for sandbox" ON public.briefings;
        CREATE POLICY "Enable all access for sandbox" ON public.briefings
            FOR ALL USING (true) WITH CHECK (true);
            
        CREATE OR REPLACE FUNCTION get_briefing_by_token(p_token text)
        RETURNS TABLE (
          id uuid,
          status text,
          template_id uuid,
          client_id uuid,
          client_name text,
          created_at timestamptz,
          updated_at timestamptz
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        DECLARE
          normalized_token text;
        BEGIN
          normalized_token := trim(p_token);
          
          RETURN QUERY
          SELECT 
            b.id,
            b.status,
            b.template_id,
            b.client_id,
            c.name as client_name,
            b.created_at,
            b.updated_at
          FROM briefings b
          LEFT JOIN clients c ON b.client_id = c.id
          WHERE b.token = normalized_token
          AND b.deleted_at IS NULL
          LIMIT 1;
        END;
        $$;
        `;

        console.log("Running SQL Schema recovery...");
        await client.query(sql);
        console.log("✅ Briefings table recovered successfully.");

    } catch (err) {
        console.error("❌ Error running SQL:", err);
    } finally {
        await client.end();
    }
}

recoverBriefings();
