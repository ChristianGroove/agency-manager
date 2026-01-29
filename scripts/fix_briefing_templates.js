
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

        console.log('🛠 Fixing briefing_templates table...');

        await client.query(`
            ALTER TABLE public.briefing_templates
            ADD COLUMN IF NOT EXISTS organization_id UUID,
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

            -- Add FK for organization_id
            -- Try catch in case it exists or org table issues
       `);

        try {
            await client.query(`
                ALTER TABLE public.briefing_templates
                ADD CONSTRAINT fk_briefing_templates_org
                FOREIGN KEY (organization_id)
                REFERENCES public.organizations(id)
                ON DELETE CASCADE;
           `);
            console.log('✅ Added FK constraint.');
        } catch (e) {
            console.log('⚠️ FK Constraint might exist: ' + e.message);
        }

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
