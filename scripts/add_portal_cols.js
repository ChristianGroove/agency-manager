
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

        console.log('🛠 Adding portal columns to clients...');

        await client.query(`
            ALTER TABLE public.clients
            ADD COLUMN IF NOT EXISTS portal_token TEXT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS portal_short_token TEXT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS portal_config JSONB DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS portal_token_expires_at TIMESTAMPTZ DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS portal_token_never_expires BOOLEAN DEFAULT FALSE;
        `);
        console.log('✅ Portal columns added.');

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
