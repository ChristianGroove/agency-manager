const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function robustHeal() {
    // const pid = removed;
    // const pass = removed;
    // const r = removed;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    try {
        await client.connect();
        console.log('--- ROBUST SANDBOX HEALING: SAAS ---');

        // 1. Ensure Tables Exist
        console.log('1. Ensuring tables...');
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
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS public.saas_products (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                pricing_model TEXT NOT NULL DEFAULT 'subscription',
                status TEXT NOT NULL DEFAULT 'published',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS public.saas_product_modules (
                product_id UUID REFERENCES public.saas_products(id) ON DELETE CASCADE,
                module_id UUID REFERENCES public.system_modules(id) ON DELETE CASCADE,
                is_default_enabled BOOLEAN DEFAULT true,
                PRIMARY KEY (product_id, module_id)
            );
            ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS subscription_product_id UUID REFERENCES public.saas_products(id);
        `);

        // 2. Seed Modules
        console.log('2. Seeding modules...');
        const modules = [
            ['core_clients', 'Client Management', 'core', false],
            ['core_services', 'Service Contracts', 'core', true, 'Mis Servicios', 'Server'],
            ['module_invoicing', 'Invoicing & Payments', 'addon', true, 'Pagos', 'CreditCard'],
            ['module_briefings', 'Briefing System', 'addon', true, 'Proyectos', 'Layers'],
            ['module_catalog', 'Product Catalog', 'addon', true, 'Explorar', 'Search'],
            ['meta_insights', 'Insights', 'special', true, 'Insights', 'BarChart3'],
            ['module_whitelabel', 'White Label', 'addon', false]
        ];

        for (const m of modules) {
            await client.query(`
                INSERT INTO public.system_modules (key, name, category, has_client_portal_view, portal_tab_label, portal_icon_key)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (key) DO UPDATE SET 
                    name = EXCLUDED.name, 
                    has_client_portal_view = EXCLUDED.has_client_portal_view,
                    portal_tab_label = EXCLUDED.portal_tab_label,
                    portal_icon_key = EXCLUDED.portal_icon_key;
            `, [m[0], m[1], m[2], m[3], m[4] || null, m[5] || null]);
        }

        // 3. Create Package
        console.log('3. Creating Complete Package...');
        const resPkg = await client.query(`
            INSERT INTO public.saas_products (name, slug, pricing_model, status)
            VALUES ('Complete SaaS Package - Pixy', 'complete-package-pixy', 'subscription', 'published')
            ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
            RETURNING id;
        `);
        const pkgId = resPkg.rows[0].id;

        // 4. Link all modules to package
        console.log('4. Linking modules to package...');
        await client.query(`
            INSERT INTO public.saas_product_modules (product_id, module_id)
            SELECT $1, id FROM public.system_modules
            ON CONFLICT DO NOTHING;
        `, [pkgId]);

        // 5. Assign to Org
        console.log('5. Assigning package to organization...');
        await client.query(`
            UPDATE public.organizations 
            SET subscription_product_id = $1, subscription_status = 'active'
            WHERE name ILIKE '%pixy%';
        `, [pkgId]);

        // 6. Reload 
        await client.query("NOTIFY pgrst, 'reload schema';");

        console.log('✅ ROBUST HEALING COMPLETED.');

    } catch (err) {
        console.error('❌ Error during robust healing:', err.message);
    } finally {
        await client.end();
    }
}

robustHeal();
