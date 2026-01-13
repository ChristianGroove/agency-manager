import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
    try {
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

        const { data, error } = await supabaseAdmin
            .from('saas_apps')
            .upsert(apps, { onConflict: 'id' })
            .select();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Also seed modules
        const modules = [
            { app_id: 'app_marketing_starter', module_key: 'core_clients', auto_enable: true, is_core: true, is_optional: false, sort_order: 1 },
            { app_id: 'app_marketing_starter', module_key: 'core_settings', auto_enable: true, is_core: true, is_optional: false, sort_order: 2 },
            { app_id: 'app_marketing_starter', module_key: 'module_quotes', auto_enable: true, is_core: false, is_optional: false, sort_order: 3 },
            { app_id: 'app_marketing_starter', module_key: 'module_briefings', auto_enable: true, is_core: false, is_optional: false, sort_order: 4 },
            { app_id: 'app_marketing_starter', module_key: 'module_catalog', auto_enable: false, is_core: false, is_optional: true, sort_order: 5 },

            { app_id: 'app_cleaning_pro', module_key: 'core_clients', auto_enable: true, is_core: true, is_optional: false, sort_order: 1 },
            { app_id: 'app_cleaning_pro', module_key: 'core_settings', auto_enable: true, is_core: true, is_optional: false, sort_order: 2 },
            { app_id: 'app_cleaning_pro', module_key: 'module_appointments', auto_enable: true, is_core: false, is_optional: false, sort_order: 3 },
            { app_id: 'app_cleaning_pro', module_key: 'module_invoicing', auto_enable: true, is_core: false, is_optional: false, sort_order: 4 },
            { app_id: 'app_cleaning_pro', module_key: 'module_payments', auto_enable: false, is_core: false, is_optional: true, sort_order: 5 },

            { app_id: 'app_consulting_essential', module_key: 'core_clients', auto_enable: true, is_core: true, is_optional: false, sort_order: 1 },
            { app_id: 'app_consulting_essential', module_key: 'core_settings', auto_enable: true, is_core: true, is_optional: false, sort_order: 2 },
            { app_id: 'app_consulting_essential', module_key: 'module_quotes', auto_enable: true, is_core: false, is_optional: false, sort_order: 3 },
            { app_id: 'app_consulting_essential', module_key: 'module_briefings', auto_enable: true, is_core: false, is_optional: false, sort_order: 4 },
            { app_id: 'app_consulting_essential', module_key: 'module_appointments', auto_enable: false, is_core: false, is_optional: true, sort_order: 5 }
        ];

        const { error: modulesError } = await supabaseAdmin
            .from('saas_app_modules')
            .upsert(modules, { onConflict: 'app_id, module_key' });

        if (modulesError) {
            return NextResponse.json({ success: true, warning: "Apps seeded but modules failed", modulesError: modulesError.message });
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
