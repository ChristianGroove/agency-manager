const { Client } = require('pg');

async function seedOperational() {
    const pid = 'uqnsdylhyenfmfkxmkrn';
    const pass = 'Valentinfer1987*';
    const r = 'us-west-2';

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    try {
        await client.connect();
        console.log('--- SEEDING OPERATIONAL TABLES ---');

        // 1. CRM PIPELINES & STAGES
        console.log('Creating CRM tables...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.pipelines (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                organization_id UUID NOT NULL,
                name TEXT NOT NULL,
                is_default BOOLEAN DEFAULT false,
                process_enabled BOOLEAN DEFAULT false
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS public.pipeline_stages (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                organization_id UUID NOT NULL,
                name TEXT NOT NULL,
                status_key TEXT,
                display_order INTEGER DEFAULT 0,
                color TEXT,
                icon TEXT,
                is_active BOOLEAN DEFAULT true,
                is_final BOOLEAN DEFAULT false
            );
        `);

        // 2. INTEGRATION CONNECTIONS (Channels)
        console.log('Creating integration_connections...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.integration_connections (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                organization_id UUID NOT NULL,
                provider_key TEXT NOT NULL,
                provider_id UUID,
                connection_name TEXT,
                credentials JSONB DEFAULT '{}'::jsonb,
                config JSONB DEFAULT '{}'::jsonb,
                metadata JSONB DEFAULT '{}'::jsonb,
                status TEXT DEFAULT 'active',
                is_primary BOOLEAN DEFAULT false,
                last_synced_at TIMESTAMPTZ
            );
        `);

        // 3. QUOTES & RPC
        console.log('Creating Quotes table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.quotes (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                organization_id UUID NOT NULL,
                lead_id UUID,
                client_id UUID,
                number TEXT,
                status TEXT DEFAULT 'draft',
                date DATE,
                valid_until DATE,
                total NUMERIC DEFAULT 0,
                subtotal NUMERIC DEFAULT 0,
                tax NUMERIC DEFAULT 0,
                discount NUMERIC DEFAULT 0,
                currency TEXT DEFAULT 'COP',
                notes TEXT,
                items JSONB DEFAULT '[]'::jsonb,
                terms TEXT,
                deleted_at TIMESTAMPTZ
            );
        `);

        console.log('Creating Sequence RPC function...');
        await client.query(`
            CREATE OR REPLACE FUNCTION public.get_next_sequence_value(org_id UUID, entity_key TEXT)
            RETURNS INTEGER AS $$
            DECLARE
                next_val INTEGER;
            BEGIN
                -- Simple sequence simulation for Sandbox
                -- In Prod this might be a real sequence table
                -- Here we just count existing + 1 (not atomic perfectly but fine for sandbox)
                IF entity_key = 'quote' THEN
                    SELECT COUNT(*) + 1 INTO next_val FROM public.quotes WHERE organization_id = org_id;
                ELSE
                    next_val := 1;
                END IF;
                
                RETURN next_val;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // 4. Disable RLS (Safe for Sandbox)
        console.log('Disabling RLS on new tables...');
        const tables = ['pipelines', 'pipeline_stages', 'integration_connections', 'quotes'];
        for (const t of tables) {
            await client.query(`ALTER TABLE public.${t} DISABLE ROW LEVEL SECURITY`);
        }

        console.log('✅ OPERATIONAL TABLES SEEDED.');

    } catch (err) {
        console.error('❌ Error seeding operational:', err.message);
    } finally {
        await client.end();
    }
}

seedOperational();
