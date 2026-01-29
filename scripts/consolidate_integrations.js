const { Client } = require('pg');

async function consolidateIntegrations() {
    const pid = 'uqnsdylhyenfmfkxmkrn';
    const pass = 'Valentinfer1987*';
    const r = 'us-west-2';

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    try {
        await client.connect();
        console.log('--- CONSOLIDATING INTEGRATIONS ---');

        // 1. Ensure integration_providers has is_enabled (it should, but double check)
        await client.query('ALTER TABLE IF EXISTS public.integration_providers ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true');

        // 2. Clear old data from integration_providers to avoid conflicts/stale data
        //    (Safest for Sandbox since we want to mirror Prod via seed script logic)
        //    Actually, better to upsert from `integrations` table if it exists.

        const integrationsExists = await client.query("SELECT * FROM information_schema.tables WHERE table_name = 'integrations'");

        if (integrationsExists.rowCount > 0) {
            console.log('Found duplicate table: integrations. Merging data...');

            // Get data from temporary 'integrations' table
            const res = await client.query('SELECT * FROM public.integrations');

            console.log(`Found ${res.rowCount} rows in integrations.`);

            for (const row of res.rows) {
                // Upsert into integration_providers
                // Map columns: is_active (if exists in source) -> is_enabled
                const isEnabled = row.is_active !== undefined ? row.is_active : (row.is_enabled !== undefined ? row.is_enabled : true);

                await client.query(`
                    INSERT INTO public.integration_providers (key, name, description, category, icon_url, is_enabled)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (key) DO UPDATE 
                    SET 
                        name = EXCLUDED.name,
                        description = EXCLUDED.description,
                        category = EXCLUDED.category,
                        icon_url = EXCLUDED.icon_url,
                        is_enabled = EXCLUDED.is_enabled;
                `, [row.key, row.name, row.description, row.category, row.icon_url, isEnabled]);
            }

            console.log('Data merged.');

            // DROP the incorrect table
            console.log('Dropping table integrations...');
            await client.query('DROP TABLE public.integrations');
        } else {
            console.log('Table integrations not found. No merge needed.');
        }

        console.log('✅ CONSOLIDATION COMPLETE.');

    } catch (err) {
        console.error('❌ Error consolidating:', err.message);
    } finally {
        await client.end();
    }
}

consolidateIntegrations();
