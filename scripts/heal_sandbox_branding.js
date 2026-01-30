const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function healPart2() {
    // const pid = removed;
    // const pass = removed;
    // const r = removed;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new Client({
        connectionString: 'postgresql://postgres.' + pid + ':' + pass + '@aws-0-' + r + '.pooler.supabase.com:5432/postgres?sslmode=require',
    });

    try {
        await client.connect();

        console.log('--- SANDBOX HEALING PART 2: BRANDING & SETTINGS ---');

        // 1. BRANDING TIERS
        console.log('Creating branding_tiers...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.branding_tiers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                display_name TEXT NOT NULL,
                features JSONB NOT NULL DEFAULT '{}'::jsonb,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            );
            ALTER TABLE public.branding_tiers ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "view_active_tiers" ON public.branding_tiers;
            CREATE POLICY "view_active_tiers" ON public.branding_tiers FOR SELECT USING (true);
        `);

        console.log('Seeding branding_tiers...');
        await client.query(`
            INSERT INTO public.branding_tiers (id, name, display_name, features) VALUES
            ('basic', 'basic', 'Basic Branding', '{"custom_logo": false, "custom_colors": false, "remove_pixy_branding": false}'),
            ('custom', 'custom', 'Custom Branding', '{"custom_logo": true, "custom_colors": true, "remove_pixy_branding": true}'),
            ('whitelabel', 'whitelabel', 'White Label', '{"custom_logo": true, "custom_colors": true, "remove_pixy_branding": true, "custom_domain": true}')
            ON CONFLICT (id) DO UPDATE SET features = EXCLUDED.features;
        `);

        // 2. PLATFORM SETTINGS
        console.log('Creating platform_settings...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.platform_settings (
                id bigint PRIMARY KEY CHECK (id = 1),
                agency_name text NOT NULL DEFAULT 'Pixy',
                main_logo_url text,
                main_logo_light_url text,
                portal_logo_url text,
                favicon_url text,
                brand_color_primary text DEFAULT '#4F46E5',
                brand_color_secondary text DEFAULT '#EC4899',
                login_background_url text,
                social_links jsonb DEFAULT '{}'::jsonb,
                created_at timestamp with time zone DEFAULT now()
            );
            ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "public_read_platform" ON public.platform_settings;
            CREATE POLICY "public_read_platform" ON public.platform_settings FOR SELECT USING (true);
        `);

        console.log('Seeding platform_settings (Pixy Queen Brand)...');
        await client.query(`
            INSERT INTO public.platform_settings (id, agency_name, brand_color_primary, brand_color_secondary)
            VALUES (1, 'Pixy', '#4F46E5', '#EC4899')
            ON CONFLICT (id) DO NOTHING;
        `);

        // 3. ORGANIZATION SETTINGS
        console.log('Creating organization_settings...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.organization_settings (
                organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
                agency_name TEXT,
                main_logo_url TEXT,
                main_logo_light_url TEXT,
                portal_logo_url TEXT,
                isotipo_url TEXT,
                portal_primary_color TEXT DEFAULT '#4F46E5',
                portal_secondary_color TEXT DEFAULT '#EC4899',
                brand_font_family TEXT DEFAULT 'Inter',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
            ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "members_read_settings" ON public.organization_settings;
            CREATE POLICY "members_read_settings" ON public.organization_settings FOR SELECT 
                USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
        `);

        // 4. Update Organizations with Branding Tier
        console.log('Updating organizations table...');
        await client.query(`
            ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS branding_tier_id TEXT REFERENCES public.branding_tiers(id) DEFAULT 'basic';
            UPDATE public.organizations SET branding_tier_id = 'basic' WHERE branding_tier_id IS NULL;
        `);

        // 5. Seed default settings for the main org
        console.log('Seeding default organization settings...');
        await client.query(`
            INSERT INTO public.organization_settings (organization_id, agency_name, portal_primary_color)
            SELECT id, name, '#4F46E5' FROM public.organizations
            ON CONFLICT (organization_id) DO NOTHING;
        `);

        // 6. Reload Cache
        await client.query("NOTIFY pgrst, 'reload schema';");

        console.log('✅ HEALING PART 2 COMPLETED.');

    } catch (err) {
        console.error('❌ Error during healing:', err.message);
    } finally {
        await client.end();
    }
}

healPart2();
