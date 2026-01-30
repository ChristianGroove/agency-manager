const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function cleanAndRecreate() {
    // const pid = removed;
    // const pass = removed;
    // const r = removed;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    try {
        await client.connect();
        console.log('--- CLEAN SWEEP: SAAS CORE ---');

        // 1. Drop EVERYTHING
        console.log('Dropping tables...');
        await client.query('DROP TABLE IF EXISTS public.organization_saas_products CASCADE');
        await client.query('DROP TABLE IF EXISTS public.saas_product_modules CASCADE');
        await client.query('DROP TABLE IF EXISTS public.saas_products CASCADE');
        await client.query('DROP TABLE IF EXISTS public.system_modules CASCADE');

        // 2. Recreate System Modules
        console.log('Creating system_modules...');
        await client.query(`
            CREATE TABLE public.system_modules (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                key TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL CHECK (category IN ('core', 'addon', 'special')),
                is_active BOOLEAN DEFAULT true,
                has_client_portal_view BOOLEAN DEFAULT false,
                portal_tab_label TEXT,
                portal_icon_key TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
        `);

        // 3. Recreate Saas Products
        console.log('Creating saas_products...');
        await client.query(`
            CREATE TABLE public.saas_products (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                pricing_model TEXT NOT NULL DEFAULT 'subscription',
                status TEXT NOT NULL DEFAULT 'published',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
        `);

        // 4. Recreate Join Tables
        console.log('Creating join tables...');
        await client.query(`
            CREATE TABLE public.saas_product_modules (
                product_id UUID REFERENCES public.saas_products(id) ON DELETE CASCADE,
                module_id UUID REFERENCES public.system_modules(id) ON DELETE CASCADE,
                is_default_enabled BOOLEAN DEFAULT true,
                PRIMARY KEY (product_id, module_id)
            );
            CREATE TABLE public.organization_saas_products (
                organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
                product_id UUID REFERENCES public.saas_products(id) ON DELETE CASCADE,
                status TEXT NOT NULL DEFAULT 'active',
                activated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                PRIMARY KEY (organization_id, product_id)
            );
        `);

        // 5. RLS
        console.log('Applying RLS...');
        await client.query(`
            ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.saas_products ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.saas_product_modules ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.organization_saas_products ENABLE ROW LEVEL SECURITY;
            CREATE POLICY "Public read modules" ON public.system_modules FOR SELECT USING (true);
            CREATE POLICY "Public read products" ON public.saas_products FOR SELECT USING (true);
            CREATE POLICY "Public read product modules" ON public.saas_product_modules FOR SELECT USING (true);
            CREATE POLICY "Public read org products" ON public.organization_saas_products FOR SELECT USING (true);
        `);

        console.log('✅ CLEAN SWEEP COMPLETED.');

    } catch (err) {
        console.error('❌ Error during clean sweep:', err.message);
    } finally {
        await client.end();
    }
}

cleanAndRecreate();
