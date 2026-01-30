
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pid = 'uqnsdylhyenfmfkxmkrn';
// const pass = removed;
const r = 'us-west-2';

const connectionString = process.env.DATABASE_URL;

const client = new Client({ connectionString });

async function check() {
    try {
        await client.connect();

        console.log('🔍 Checking user_preferences table...');

        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_preferences';
        `);

        if (res.rows.length === 0) {
            console.log('❌ Table "user_preferences" does NOT exist.');
        } else {
            console.log('✅ Table "user_preferences" exists.');
            // Check columns
            const cols = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'user_preferences';
             `);
            console.table(cols.rows);
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

check();
