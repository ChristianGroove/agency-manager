
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

        console.log('🛠 Fixing service_catalog schema...');

        await client.query(`
            ALTER TABLE public.service_catalog
            ADD COLUMN IF NOT EXISTS organization_id UUID,
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

            -- Link to Organizations
             ALTER TABLE public.service_catalog
             DROP CONSTRAINT IF EXISTS fk_catalog_org;
             
             ALTER TABLE public.service_catalog
             ADD CONSTRAINT fk_catalog_org
             FOREIGN KEY (organization_id)
             REFERENCES public.organizations(id)
             ON DELETE CASCADE;
        `);
        console.log('✅ Columns and FK added.');

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
