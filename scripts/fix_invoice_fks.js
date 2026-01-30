
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

        console.log('🛠 Adding FK constraints to invoices...');

        // 1. client_id -> clients(id)
        try {
            await client.query(`
                ALTER TABLE public.invoices
                ADD CONSTRAINT fk_invoices_client
                FOREIGN KEY (client_id)
                REFERENCES public.clients(id)
                ON DELETE CASCADE;
            `);
            console.log('✅ client_id FK added.');
        } catch (e) {
            console.log('⚠️ client_id FK might already exist:', e.message);
        }

        // 2. organization_id -> organizations(id)
        try {
            await client.query(`
                ALTER TABLE public.invoices
                ADD CONSTRAINT fk_invoices_organization
                FOREIGN KEY (organization_id)
                REFERENCES public.organizations(id)
                ON DELETE CASCADE;
            `);
            console.log('✅ organization_id FK added.');
        } catch (e) {
            console.log('⚠️ organization_id FK might already exist:', e.message);
        }

        // 3. billing_cycle_id -> billing_cycles(id)
        try {
            await client.query(`
                ALTER TABLE public.invoices
                ADD CONSTRAINT fk_invoices_cycle
                FOREIGN KEY (billing_cycle_id)
                REFERENCES public.billing_cycles(id)
                ON DELETE SET NULL;
            `);
            console.log('✅ billing_cycle_id FK added.');
        } catch (e) {
            console.log('⚠️ billing_cycle_id FK might already exist:', e.message);
        }

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
