
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
        console.log('✅ Connected.');

        console.log('🛠 Adding "organization_id" to "clients"...');
        await client.query(`
            ALTER TABLE public.clients
            ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
        `);
        console.log('✅ ALTER TABLE executed.');

        // Verification
        const res = await client.query(`
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'clients' AND column_name = 'organization_id';
        `);

        if (res.rows.length > 0) {
            console.log('✅ SUCCESS: "organization_id" is now present in "clients".');
        } else {
            console.error('❌ FAILURE: Column still not found.');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

fix();
