const { Client } = require('pg');

async function fixGrants() {
    const pid = 'uqnsdylhyenfmfkxmkrn';
    const pass = 'Valentinfer1987*';
    const r = 'us-west-2';

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    try {
        await client.connect();

        console.log('--- FIXING GRANTS ---');

        // 1. Schema Usage
        await client.query("GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;");

        // 2. Table Grants (Broad for Sandbox)
        await client.query("GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;");
        await client.query("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;");
        await client.query("GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;");

        // 3. Sequence Grants
        await client.query("GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;");
        await client.query("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;");

        // 4. Default Grants for Future Tables
        await client.query("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;");
        await client.query("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;");
        await client.query("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;");

        console.log('✅ GRANTS APPLIED.');

    } catch (err) {
        console.error('❌ Error applying grants:', err.message);
    } finally {
        await client.end();
    }
}

fixGrants();
