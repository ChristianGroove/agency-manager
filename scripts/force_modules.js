const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function forceModules() {
    // const pid = removed;
    // const pass = removed;
    // const r = removed;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    try {
        await client.connect();

        console.log('--- FORCING MODULE OVERRIDES ---');

        const allModules = [
            'core_clients',
            'core_services',
            'module_invoicing',
            'module_briefings',
            'module_catalog',
            'meta_insights',
            'module_whitelabel',
            'module_projects',
            'module_crm',
            'module_contracts', // Added
            'module_hosting',   // Added
            'module_communications', // Added for Notifications Tab
            'module_quotes',    // Added just in case
            'module_cleaning',  // Added just in case
            'module_payments'   // Added just in case
        ];

        // Using parameterized query which PG handles as array
        const res = await client.query(
            "UPDATE public.organizations SET manual_module_overrides = $1 WHERE name ILIKE '%pixy%'",
            [allModules]
        );

        console.log(`Updated ${res.rowCount} row(s).`);
        console.log('✅ MODULES FORCED.');

    } catch (err) {
        console.error('❌ Error forcing modules:', err.message);
    } finally {
        await client.end();
    }
}

forceModules();
