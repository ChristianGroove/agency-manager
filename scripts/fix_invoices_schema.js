
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

        console.log('🛠 Patching invoices table schema...');

        await client.query(`
            ALTER TABLE public.invoices
            ADD COLUMN IF NOT EXISTS billing_cycle_id UUID DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS organization_id UUID DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS emitter_id UUID DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS service_id UUID DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
        `);
        console.log('✅ Columns added.');

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
