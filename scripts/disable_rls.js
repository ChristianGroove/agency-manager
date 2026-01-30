const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function disableRLS() {
    // const pid = removed;
    // const pass = removed;
    // const r = removed;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    try {
        await client.connect();
        console.log('--- DISABLING RLS (NUCLEAR OPTION) ---');

        await client.query("ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;");
        await client.query("ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;");

        // Also ensure grants are perfect (redundant but safe)
        await client.query("GRANT ALL ON public.organization_members TO authenticated;");
        await client.query("GRANT ALL ON public.organizations TO authenticated;");

        console.log('✅ RLS DISABLED. ACCESS SHOULD BE OPEN.');

    } catch (err) {
        console.error('❌ Error disabling RLS:', err.message);
    } finally {
        await client.end();
    }
}

disableRLS();
