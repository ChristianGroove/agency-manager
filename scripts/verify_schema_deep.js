
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pid = 'uqnsdylhyenfmfkxmkrn';
// const pass = removed;
const r = 'us-west-2';

const connectionString = process.env.DATABASE_URL;

const client = new Client({ connectionString });

async function verify() {
    try {
        await client.connect();

        const tables = ['services', 'clients'];

        for (const table of tables) {
            const res = await client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = '${table}'
                ORDER BY column_name;
            `);

            console.log(`\n=== ${table} COLUMNS ===`);
            console.log(JSON.stringify(res.rows, null, 2));
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

verify();
