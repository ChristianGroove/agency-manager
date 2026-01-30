const { Client } = require('pg');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function run() {
    const client = new Client({
        connectionString: 'postgresql://postgres.uqnsdylhyenfmfkxmkrn:Valentinfer1987*@aws-0-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require'
    });
    try {
        await client.connect();
        const tables = ['organizations', 'clients', 'service_catalog', 'organization_settings'];
        for (const table of tables) {
            const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name = $1", [table]);
            console.log(`--- ${table} ---`);
            console.log(res.rows.map(r => r.column_name).join(', '));
        }
    } catch (e) {
        console.error(e.message);
    } finally {
        await client.end();
    }
}
run();
