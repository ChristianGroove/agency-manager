
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

        console.log('🛠 Adding social media columns...');

        await client.query(`
            ALTER TABLE public.clients
            ADD COLUMN IF NOT EXISTS facebook TEXT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS twitter TEXT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS linkedin TEXT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS website TEXT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
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
