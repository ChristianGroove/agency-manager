
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pid = 'uqnsdylhyenfmfkxmkrn';
// const pass = removed;
const r = 'us-west-2';

const connectionString = process.env.DATABASE_URL;

const client = new Client({ connectionString });

async function fix() {
    try {
        await client.connect();

        console.log('🛠 Adding deleted_at to service_categories...');

        await client.query(`
            ALTER TABLE public.service_categories
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
        `);
        console.log('✅ deleted_at column added.');

        // Also check if services.category is TEXT or UUID
        // If it's expected to be a relation, we might need a FK, 
        // BUT the legacy system often used string slugs.
        // Let's safe-bet on simply fixing the deleted_at first as that blocked everything else.

        console.log('🔄 Reloading Schema Cache...');
        await client.query("NOTIFY pgrst, 'reload config'");
        console.log('✅ Reload triggered.');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

fix();
