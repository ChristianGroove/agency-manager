
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

        // Extended list of tables needing deleted_at
        const tables = ['invoices', 'quotes', 'subscriptions']; // clients & services already done

        for (const table of tables) {
            console.log(`\n🛠 Inspecting "${table}"...`);

            // Add deleted_at if missing
            await client.query(`
                ALTER TABLE public.${table}
                ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
            `);
            console.log(`✅ "deleted_at" ensured.`);

            // Add updated_at just in case
            await client.query(`
                ALTER TABLE public.${table}
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
            `);
            console.log(`✅ "updated_at" ensured.`);
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

fix();
