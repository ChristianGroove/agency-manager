import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
    const { data: set } = await supabase.from('organization_settings').select('*').limit(1)
    console.log('organization_settings cols:', Object.keys(set?.[0] || {}))

    const { data: org } = await supabase.from('organizations').select('*').limit(1)
    console.log('organizations cols:', Object.keys(org?.[0] || {}))

    const { data: subs } = await supabase.from('saas_subscriptions').select('*').limit(1)
    console.log('saas_subscriptions cols:', Object.keys(subs?.[0] || {}))
}

check().catch(console.error)
