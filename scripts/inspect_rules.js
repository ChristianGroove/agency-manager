const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function inspectRules() {
    console.log("--- RULES INSPECTION ---")
    const { data: rules, error } = await supabase.from('assignment_rules').select('*')
    if (error) {
        console.error("Error fetching rules:", error)
        return
    }

    rules?.forEach(r => {
        console.log(`\nRule: ${r.name}`)
        console.log(`- ID: ${r.id}`)
        console.log(`- Strategy: ${r.strategy}`)
        console.log(`- Assigned To (Raw):`, r.assigned_to)
        console.log(`- Type: ${typeof r.assigned_to}`)
        console.log(`- Length: ${r.assigned_to?.length}`)
    })
}

inspectRules()
