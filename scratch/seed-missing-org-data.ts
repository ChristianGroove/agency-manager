import { supabaseAdmin } from "@/modules/core/database/supabase-admin"

async function seedMissingOrgData() {
    console.log("Seeding missing organization_settings and saas_subscriptions...")

    const { data: orgs } = await supabaseAdmin.from('organizations').select('id, name, active_app_id')
    if (!orgs) return

    for (const org of orgs) {
        // 1. organization_settings
        const { data: settings } = await supabaseAdmin
            .from('organization_settings')
            .select('id')
            .eq('organization_id', org.id)
            .maybeSingle()

        if (!settings) {
            console.log(`Seeding organization_settings for org ${org.name} (${org.id})...`)
            await supabaseAdmin.from('organization_settings').insert({
                organization_id: org.id,
                agency_name: org.name
            })
        }

        // 2. saas_subscriptions
        const { data: sub } = await supabaseAdmin
            .from('saas_subscriptions')
            .select('id')
            .eq('organization_id', org.id)
            .maybeSingle()

        if (!sub) {
            console.log(`Seeding saas_subscriptions for org ${org.name} (${org.id})...`)
            await supabaseAdmin.from('saas_subscriptions').insert({
                organization_id: org.id,
                plan_id: org.active_app_id || 'resto_space',
                status: 'active',
                payment_gateway: 'manual',
                current_period_start: new Date().toISOString()
            })
        }
    }

    console.log("✅ Seeding complete!")
}

seedMissingOrgData().catch(console.error)
