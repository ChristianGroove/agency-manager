import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function seedApps() {
    console.log('🌱 Starting SaaS Apps Seeding...');

    // Dynamic import to ensure env vars are loaded BEFORE this module is imported
    const { supabaseAdmin } = await import('../lib/supabase-admin');

    try {
        // 1. Define Apps
        const apps = [
            {
                id: 'app_marketing_starter',
                name: 'Marketing Agency Starter',
                slug: 'marketing-agency-starter',
                description: 'Everything you need to run a marketing agency',
                long_description: 'Complete solution for marketing agencies with client management, quotes, portfolio showcase, and lead tracking. Perfect for agencies getting started.',
                category: 'agency',
                vertical_compatibility: ['agency', 'creative', 'consulting'],
                icon: 'Rocket',
                color: '#ec4899',
                price_monthly: 49,
                trial_days: 14,
                is_active: true,
                is_featured: true,
                sort_order: 1
            },
            {
                id: 'app_cleaning_pro',
                name: 'Cleaning Business Pro',
                slug: 'cleaning-business-pro',
                description: 'Manage cleaning jobs, staff, and operations',
                long_description: 'Professional cleaning business management with job scheduling, staff management, operations tracking, and payroll integration.',
                category: 'cleaning',
                vertical_compatibility: ['cleaning', 'maintenance'],
                icon: 'Sparkles',
                color: '#10b981',
                price_monthly: 79,
                trial_days: 14,
                is_active: true,
                is_featured: true,
                sort_order: 2
            },
            {
                id: 'app_consulting_essential',
                name: 'Consulting Firm Essential',
                slug: 'consulting-firm-essential',
                description: 'Professional consulting practice management',
                long_description: 'Essential tools for consulting firms including client management, quotes, briefings, and portfolio showcase.',
                category: 'consulting',
                vertical_compatibility: ['consulting', 'agency'],
                icon: 'Briefcase',
                color: '#3b82f6',
                price_monthly: 59,
                trial_days: 14,
                is_active: true,
                is_featured: false,
                sort_order: 3
            }
        ];

        console.log(`📦 Seeding ${apps.length} apps...`);

        const { error: appsError } = await supabaseAdmin
            .from('saas_apps')
            .upsert(apps, { onConflict: 'id' });

        if (appsError) {
            console.error('❌ Error seeding apps:', appsError.message);
            process.exit(1);
        }

        console.log('✅ Apps seeded successfully.');

        // 2. Define Modules
        const modules = [
            // Marketing
            { app_id: 'app_marketing_starter', module_key: 'core_clients', auto_enable: true, is_core: true, is_optional: false, sort_order: 1 },
            { app_id: 'app_marketing_starter', module_key: 'core_settings', auto_enable: true, is_core: true, is_optional: false, sort_order: 2 },
            { app_id: 'app_marketing_starter', module_key: 'module_quotes', auto_enable: true, is_core: false, is_optional: false, sort_order: 3 },
            { app_id: 'app_marketing_starter', module_key: 'module_briefings', auto_enable: true, is_core: false, is_optional: false, sort_order: 4 },
            { app_id: 'app_marketing_starter', module_key: 'module_catalog', auto_enable: false, is_core: false, is_optional: true, sort_order: 5 },

            // Cleaning
            { app_id: 'app_cleaning_pro', module_key: 'core_clients', auto_enable: true, is_core: true, is_optional: false, sort_order: 1 },
            { app_id: 'app_cleaning_pro', module_key: 'core_settings', auto_enable: true, is_core: true, is_optional: false, sort_order: 2 },
            { app_id: 'app_cleaning_pro', module_key: 'module_appointments', auto_enable: true, is_core: false, is_optional: false, sort_order: 3 },
            { app_id: 'app_cleaning_pro', module_key: 'module_invoicing', auto_enable: true, is_core: false, is_optional: false, sort_order: 4 },
            { app_id: 'app_cleaning_pro', module_key: 'module_payments', auto_enable: false, is_core: false, is_optional: true, sort_order: 5 },

            // Consulting
            { app_id: 'app_consulting_essential', module_key: 'core_clients', auto_enable: true, is_core: true, is_optional: false, sort_order: 1 },
            { app_id: 'app_consulting_essential', module_key: 'core_settings', auto_enable: true, is_core: true, is_optional: false, sort_order: 2 },
            { app_id: 'app_consulting_essential', module_key: 'module_quotes', auto_enable: true, is_core: false, is_optional: false, sort_order: 3 },
            { app_id: 'app_consulting_essential', module_key: 'module_briefings', auto_enable: true, is_core: false, is_optional: false, sort_order: 4 },
            { app_id: 'app_consulting_essential', module_key: 'module_appointments', auto_enable: false, is_core: false, is_optional: true, sort_order: 5 }
        ];

        console.log(`🔗 Seeding ${modules.length} module links...`);

        const { error: modulesError } = await supabaseAdmin
            .from('saas_app_modules')
            .upsert(modules, { onConflict: 'app_id, module_key' });

        if (modulesError) {
            console.error('❌ Error seeding modules:', modulesError.message);
            // Don't exit, might be partial success
        } else {
            console.log('✅ Modules seeded successfully.');
        }

        console.log('🚀 Seeding complete!');

    } catch (error: any) {
        console.error('❌ Unexpected error:', error.message);
        process.exit(1);
    }
}

seedApps();
