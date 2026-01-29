
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

        console.log('🔍 Checking Client Portal Tokens...');

        const res = await client.query(`
            SELECT id, name, portal_token, portal_short_token 
            FROM clients 
            WHERE deleted_at IS NULL
            LIMIT 5;
        `);

        if (res.rows.length === 0) {
            console.log('❌ No active clients found.');
        } else {
            console.table(res.rows);
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

check();
