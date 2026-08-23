import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('1. Checking existing SaaS Apps in database...');
    const { data: apps, error: appsErr } = await supabase.from('saas_apps').select('*');
    if (appsErr) {
        console.error('Error querying saas_apps:', appsErr);
        return;
    }
    console.log('Existing Apps Count:', apps?.length);
    apps?.forEach(a => {
        console.log(`- [${a.id}] "${a.name}" (slug: ${a.slug}, category: ${a.category}, space_category: ${a.space_category}, active: ${a.is_active})`);
    });

    console.log('\n2. Upserting Real Estate Space into saas_apps...');
    const realEstateApp = {
        id: 'app_real_estate_pro',
        name: 'Real Estate Space',
        slug: 'real-estate-space',
        description: 'Gestión de propiedades, prospectos inmobiliarios y comercialización PropTech',
        long_description: 'Solución integral para agencias inmobiliarias y empresas PropTech con catálogo de propiedades, cotizaciones, CRM de prospectos, mensajería y automatización.',
        category: 'real_estate',
        space_category: 'real_estate',
        vertical_compatibility: ['real_estate', 'proptech', 'agency'],
        icon: 'Building2',
        color: '#0284c7',
        price_monthly: 99.99,
        trial_days: 14,
        is_active: true,
        is_featured: true,
        sort_order: 6
    };

    const { data: inserted, error: insertErr } = await supabase
        .from('saas_apps')
        .upsert(realEstateApp, { onConflict: 'id' })
        .select();

    if (insertErr) {
        console.error('Error upserting real estate app:', insertErr);
    } else {
        console.log('✅ Real Estate Space created/updated successfully in saas_apps:', inserted);
    }

    // 3. Link default modules
    const modulesToLink = [
        { app_id: 'app_real_estate_pro', module_key: 'core_crm', auto_enable: true, is_core: true, is_optional: false, sort_order: 1 },
        { app_id: 'app_real_estate_pro', module_key: 'core_clients', auto_enable: true, is_core: true, is_optional: false, sort_order: 2 },
        { app_id: 'app_real_estate_pro', module_key: 'core_locations', auto_enable: true, is_core: false, is_optional: false, sort_order: 3 },
        { app_id: 'app_real_estate_pro', module_key: 'module_messaging', auto_enable: true, is_core: false, is_optional: false, sort_order: 4 },
        { app_id: 'app_real_estate_pro', module_key: 'module_quotes', auto_enable: true, is_core: false, is_optional: false, sort_order: 5 },
        { app_id: 'app_real_estate_pro', module_key: 'module_catalog', auto_enable: true, is_core: false, is_optional: false, sort_order: 6 },
        { app_id: 'app_real_estate_pro', module_key: 'module_automation', auto_enable: true, is_core: false, is_optional: false, sort_order: 7 }
    ];

    const { error: modErr } = await supabase
        .from('saas_app_modules')
        .upsert(modulesToLink, { onConflict: 'app_id, module_key' });

    if (modErr) {
        console.error('Error linking modules:', modErr);
    } else {
        console.log('✅ 7 operational modules linked to app_real_estate_pro in saas_app_modules.');
    }
}

main().then(() => {
    console.log('Finished.');
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
