const { Client } = require('pg');

async function patchIntegrations() {
    const pid = 'uqnsdylhyenfmfkxmkrn';
    const pass = 'Valentinfer1987*';
    const r = 'us-west-2';

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    try {
        await client.connect();
        console.log('--- PATCHING INTEGRATIONS SCHEMA ---');

        // Check if is_active exists
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'integrations' AND column_name = 'is_active'");

        if (res.rowCount > 0) {
            console.log('Renaming is_active to is_enabled...');
            await client.query('ALTER TABLE public.integrations RENAME COLUMN is_active TO is_enabled');
        } else {
            console.log('is_active column not found. Checking if is_enabled exists...');
            const res2 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'integrations' AND column_name = 'is_enabled'");
            if (res2.rowCount > 0) {
                console.log('is_enabled already exists. Nothing to do.');
            } else {
                console.log('Adding is_enabled column...');
                await client.query('ALTER TABLE public.integrations ADD COLUMN is_enabled BOOLEAN DEFAULT true');
            }
        }

        // Also the table name in actions.ts is 'integration_providers' but I created 'integrations'.
        // Wait, actions.ts fetches from 'integration_providers'.
        // My seed script created 'public.integrations'.
        // MAJOR MISMATCH: The table name is WRONG.

        console.log('Renaming table integrations to integration_providers...');
        const tableRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'integration_providers'");

        if (tableRes.rowCount === 0) {
            const oldTableRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'integrations'");
            if (oldTableRes.rowCount > 0) {
                await client.query('ALTER TABLE public.integrations RENAME TO integration_providers');
                console.log('Renamed integrations -> integration_providers');
            } else {
                console.log('Neither table exists? (Should not happen if previous seed ran)');
            }
        } else {
            console.log('integration_providers already exists.');
        }

        console.log('✅ PATCH COMPLETE.');

    } catch (err) {
        console.error('❌ Error patching:', err.message);
    } finally {
        await client.end();
    }
}

patchIntegrations();
