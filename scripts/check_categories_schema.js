
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

        console.log('🔍 Checking service_categories table...');

        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'service_categories';
        `);

        if (res.rows.length === 0) {
            console.log('❌ Table "service_categories" does NOT exist.');
        } else {
            console.log('✅ Table "service_categories" exists.');
            // Check columns
            const cols = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'service_categories'
                ORDER BY column_name;
             `);
            console.log('Columns:');
            cols.rows.forEach(c => console.log(`- ${c.column_name}`));
        }

        // Also check if services has a category_id
        console.log('\n🔍 Checking services table category columns...');
        const servCols = await client.query(`
                SELECT column_name
                FROM information_schema.columns 
                WHERE table_name = 'services'
                AND column_name LIKE '%category%';
             `);
        servCols.rows.forEach(c => console.log(`- services.${c.column_name}`));

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

check();
