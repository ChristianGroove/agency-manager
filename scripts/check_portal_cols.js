
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pid = 'uqnsdylhyenfmfkxmkrn';
// const pass = removed;
const r = 'us-west-2';

const connectionString = process.env.DATABASE_URL;

const client = new Client({ connectionString });

async function checkColumns() {
    try {
        await client.connect();

        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'clients' 
            AND column_name LIKE 'portal_%'
            ORDER BY column_name;
        `);

        console.log('=== CLIENTS PORTAL COLUMNS ===');
        if (res.rows.length === 0) {
            console.log('❌ No portal columns found.');
        } else {
            res.rows.forEach(r => console.log(`${r.column_name} (${r.data_type})`));
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

checkColumns();
