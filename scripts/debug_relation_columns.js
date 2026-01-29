
const { Client } = require('pg');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pid = 'uqnsdylhyenfmfkxmkrn';
const pass = 'Valentinfer1987*';
const r = 'us-west-2';

const connectionString = 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require';

const client = new Client({ connectionString });

async function debugQuery() {
    try {
        await client.connect();
        console.log('✅ Connected.');

        // This attempts to replicate what PostgREST does, but manually checking columns is easier.
        // Let's check if the referenced tables have the columns requested in `getClients`

        const tablesToCheck = [
            { table: 'invoices', columns: ['deleted_at'] },
            { table: 'quotes', columns: ['deleted_at'] },
            { table: 'subscriptions', columns: ['deleted_at', 'status', 'amount', 'service_type', 'frequency'] },
            { table: 'services', columns: ['deleted_at', 'status'] },
            { table: 'hosting_accounts', columns: ['status', 'renewal_date'] }
        ];

        for (const t of tablesToCheck) {
            console.log(`\n🔍 Checking table: ${t.table}`);
            for (const col of t.columns) {
                const res = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND column_name = $2
                `, [t.table, col]);

                if (res.rows.length === 0) {
                    console.error(`❌ MISSING COLUMN: ${t.table}.${col}`);
                } else {
                    console.log(`   ✅ ${t.table}.${col} exists`);
                }
            }
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

debugQuery();
