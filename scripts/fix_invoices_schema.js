
const { Client } = require('pg');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pid = 'uqnsdylhyenfmfkxmkrn';
const pass = 'Valentinfer1987*';
const r = 'us-west-2';

const connectionString = 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require';

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
