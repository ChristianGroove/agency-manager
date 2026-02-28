import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
    try {
        const token = 'GW9VJ2'
        const { data: client, error: e1 } = await supabase.from('clients').select('organization_id').eq('portal_short_token', token).single()
        console.log('Client org:', client?.organization_id, e1?.message)

        if (client?.organization_id) {
            const { data: org, error: eOrg } = await supabase.from('organizations').select('name').eq('id', client.organization_id).single()
            console.log('Org Name:', org?.name, eOrg?.message)

            const { data: settings, error: e2 } = await supabase.from('organization_settings').select('active_app_id').eq('organization_id', client.organization_id).single()
            console.log('Active App ID:', settings?.active_app_id, e2?.message)

            if (settings?.active_app_id) {
                const { data: appData, error: e3 } = await supabase.from('saas_apps').select('slug, portal_template').eq('id', settings.active_app_id).single()
                console.log('App Data:', appData, e3?.message)
            } else {
                console.log('No active app ID set for organization settings.')
            }
        }
    } catch (err) {
        console.error("FATAL:", err)
    }
}
check()
