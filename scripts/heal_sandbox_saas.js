const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function healPart3() {
    // const pid = removed;
    // const pass = removed;
    // const r = removed;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    try {
        await client.connect();

        console.log('--- SANDBOX HEALING PART 3: SAAS CORE ---');

        // 1. SYSTEM MODULES
        console.log('Patching system_modules...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.system_modules (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                key TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT NOT NULL CHECK (category IN ('core', 'addon', 'special')),
                is_active BOOLEAN DEFAULT true,
                has_client_portal_view BOOLEAN DEFAULT false,
                portal_tab_label TEXT,
                portal_icon_key TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
            ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Public read modules" ON public.system_modules;
            CREATE POLICY "Public read modules" ON public.system_modules FOR SELECT USING (true);
        `);

        console.log('Seeding system_modules...');
        await client.query(`
            INSERT INTO public.system_modules (key, name, category, has_client_portal_view, portal_tab_label, portal_icon_key)
            VALUES
                ('core_clients', 'Client Management', 'core', false, null, null),
                ('core_services', 'Service Contracts', 'core', true, 'Mis Servicios', 'Server'),
                ('module_invoicing', 'Invoicing & Payments', 'addon', true, 'Pagos', 'CreditCard'),
                ('module_briefings', 'Briefing System', 'addon', true, 'Proyectos', 'Layers'),
                ('module_catalog', 'Product Catalog', 'addon', true, 'Explorar', 'Search'),
                ('meta_insights', 'Insights', 'special', true, 'Insights', 'BarChart3')
            ON CONFLICT (key) DO UPDATE SET 
                name = EXCLUDED.name,
                category = EXCLUDED.category,
                has_client_portal_view = EXCLUDED.has_client_portal_view,
                portal_tab_label = EXCLUDED.portal_tab_label,
                portal_icon_key = EXCLUDED.portal_icon_key;
        `);

        // 2. SAAS PRODUCTS
        console.log('Creating saas_products...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.saas_products (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                pricing_model TEXT NOT NULL DEFAULT 'subscription',
                status TEXT NOT NULL DEFAULT 'published',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
            ALTER TABLE public.saas_products ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Public read products" ON public.saas_products;
            CREATE POLICY "Public read products" ON public.saas_products FOR SELECT USING (true);
        `);

        // 3. PRODUCT MODULES
        console.log('Creating saas_product_modules...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.saas_product_modules (
                product_id UUID REFERENCES public.saas_products(id) ON DELETE CASCADE,
                module_id UUID REFERENCES public.system_modules(id) ON DELETE CASCADE,
                is_default_enabled BOOLEAN DEFAULT true,
                PRIMARY KEY (product_id, module_id)
            );
            ALTER TABLE public.saas_product_modules ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Public read product modules" ON public.saas_product_modules;
            CREATE POLICY "Public read product modules" ON public.saas_product_modules FOR SELECT USING (true);
        `);

        // 4. Create Complete Package and link modules
        console.log('Seeding "Complete Package"...');
        const resPkg = await client.query(`
            INSERT INTO public.saas_products (name, slug, pricing_model, status)
            VALUES ('Complete SaaS Package - Pixy', 'complete-package-pixy', 'subscription', 'published')
            ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
            RETURNING id;
        `);
        const pkgId = resPkg.rows[0].id;

        await client.query(`
            INSERT INTO public.saas_product_modules (product_id, module_id)
            SELECT $1, id FROM public.system_modules
            ON CONFLICT (product_id, module_id) DO NOTHING;
        `, [pkgId]);

        // 5. Link Pixy Agency to the package
        console.log('Linking organization to package...');
        await client.query(`
            ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS subscription_product_id UUID REFERENCES public.saas_products(id);
            UPDATE public.organizations SET subscription_product_id = $1 WHERE name ILIKE '%pixy%';
        `, [pkgId]);

        // 6. Organization Saas Products (Junction)
        console.log('Creating organization_saas_products...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.organization_saas_products (
                organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
                product_id UUID REFERENCES public.saas_products(id) ON DELETE CASCADE,
                status TEXT NOT NULL DEFAULT 'active',
                PRIMARY KEY (organization_id, product_id)
            );
            ALTER TABLE public.organization_saas_products ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Public read org products" ON public.organization_saas_products;
            CREATE POLICY "Public read org products" ON public.organization_saas_products FOR SELECT USING (true);

            INSERT INTO public.organization_saas_products (organization_id, product_id, status)
            SELECT id, subscription_product_id, 'active' FROM public.organizations WHERE subscription_product_id IS NOT NULL
            ON CONFLICT DO NOTHING;
        `);

        // 7. Force status to active
        await client.query("UPDATE public.organizations SET subscription_status = 'active' WHERE subscription_status IS NULL OR subscription_status != 'active'");

        // 8. Reload
        await client.query("NOTIFY pgrst, 'reload schema';");

        console.log('✅ HEALING PART 3 COMPLETED.');

    } catch (err) {
        console.error('❌ Error during healing:', err.message);
    } finally {
        await client.end();
    }
}

healPart3();
