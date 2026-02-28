import { createClient } from "@supabase/supabase-js"
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env.local') })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function run() {
    const { data: spaces } = await supabase.from('saas_apps').select('id, name')

    // Get modules for Agency space
    const agencySpace = spaces?.find(s => s.name.includes('Agency') || s.id === 'app_marketing_starter')
    if (agencySpace) {
        console.log(`\nAgency Space Modules (${agencySpace.name}):`)
        const { data: appModules } = await supabase.from('saas_app_modules').select('module_key').eq('app_id', agencySpace.id)
        console.log(appModules)
    }

    // Get all system modules
    const { data: modules } = await supabase.from('system_modules').select('key, name, category, is_active')
    console.log('\nSystem Modules Catalog:')
    console.dir(modules, { depth: null })

    // Check one of the tenants
    const { data: tenant } = await supabase.from('organizations').select('id, name, active_app_id, manual_module_overrides').not('name', 'ilike', '%pixy%').limit(1).single()
    if (tenant) {
        console.log(`\nTenant Modules Context (${tenant.name}):`)
        console.log('Active App ID:', tenant.active_app_id)
        console.log('Manual Overrides:', tenant.manual_module_overrides)
    }
}

run()
