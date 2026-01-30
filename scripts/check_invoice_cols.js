
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
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'invoices' 
            ORDER BY column_name;
        `);

        console.log('=== INVOICES COLUMNS ===');
        res.rows.forEach(r => console.log(r.column_name));

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

checkColumns();
