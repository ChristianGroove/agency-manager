
const { Client } = require('pg');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pid = 'uqnsdylhyenfmfkxmkrn';
const pass = 'Valentinfer1987*';
const r = 'us-west-2';

const connectionString = 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require';

const client = new Client({ connectionString });

async function check() {
    try {
        await client.connect();

        console.log('🔍 Checking tables...');

        const tables = ['services', 'service_catalog'];

        for (const t of tables) {
            const res = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1;
            `, [t]);

            if (res.rows.length === 0) {
                console.log(`❌ Table "${t}" does NOT exist.`);
            } else {
                console.log(`✅ Table "${t}" exists.`);
                // Get columns
                const cols = await client.query(`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = $1
                    ORDER BY column_name;
                `, [t]);
                console.log(`   Columns for ${t}:`);
                cols.rows.forEach(c => console.log(`   - ${c.column_name}`));
            }
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

check();
