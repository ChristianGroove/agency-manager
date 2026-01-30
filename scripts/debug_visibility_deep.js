
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Credentials
const pid = 'uqnsdylhyenfmfkxmkrn';
// const pass = removed;
const r = 'us-west-2';

const connectionString = process.env.DATABASE_URL;

const client = new Client({ connectionString });

async function debug() {
    try {
        await client.connect();
        console.log('✅ Connected.');

        const tables = ['clients', 'services'];

        for (const table of tables) {
            console.log(`\n--- Inspecting Table: ${table} ---`);

            // 1. Check Row Count
            const countRes = await client.query(`SELECT count(*) FROM ${table}`);
            console.log(`> Total Rows: ${countRes.rows[0].count}`);

            // 2. Check RLS Status
            const rlsRes = await client.query(`
                SELECT relname, relrowsecurity 
                FROM pg_class 
                WHERE oid = '${table}'::regclass;
            `);
            const isRlsEnabled = rlsRes.rows[0]?.relrowsecurity;
            console.log(`> RLS Enabled: ${isRlsEnabled}`);

            if (isRlsEnabled) {
                // List Policies
                const polRes = await client.query(`
                    SELECT polname, polpermissive 
                    FROM pg_policy 
                    WHERE polrelid = '${table}'::regclass;
                `);
                console.log('> Policies:', polRes.rows.map(p => p.polname));
            }
        }

        // 3. Show Organization ID of seeded data
        console.log('\n--- Seeded Data Owner ---');
        const orgRes = await client.query(`SELECT DISTINCT organization_id FROM clients LIMIT 5`);
        console.log('Client Org IDs:', orgRes.rows.map(r => r.organization_id));

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

debug();
