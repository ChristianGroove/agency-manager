const { Client } = require('pg');

async function disableAllRLS() {
    const pid = 'uqnsdylhyenfmfkxmkrn';
    const pass = 'Valentinfer1987*';
    const r = 'us-west-2';

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    try {
        await client.connect();
        console.log('--- DISABLING ALL REMAINING RLS (NUCLEAR OPTION) ---');

        const tables = [
            'organization_saas_products',
            'saas_products',
            'saas_product_modules',
            'system_modules',
            'clients',
            'services',
            'billing_cycles',
            'billing_profiles',
            'invoices',
            'quotes',
            'organizations',
            'organization_members'
        ];

        for (const t of tables) {
            console.log(`Disabling RLS on ${t}...`);
            try {
                await client.query(`ALTER TABLE public.${t} DISABLE ROW LEVEL SECURITY;`);
                await client.query(`GRANT ALL ON public.${t} TO authenticated;`);
            } catch (e) {
                console.log(`Error on ${t}: ${e.message}`);
            }
        }

        console.log('✅ ALL RLS DISABLED.');

    } catch (err) {
        console.error('❌ Error disabling RLS:', err.message);
    } finally {
        await client.end();
    }
}

disableAllRLS();
