const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function run() {
    console.log("--- DUPLICATE CHECK ---")
    
    // 1. Get raw counts
    const { data: allRows } = await supabase.from('agent_availability').select('id, agent_id, organization_id')
    console.log(`Total Rows: ${allRows?.length}`)
    
    const uniqueMap = new Map()
    const duplicates = []

    allRows?.forEach(row => {
        const key = `${row.agent_id}-${row.organization_id}`
        if (uniqueMap.has(key)) {
            duplicates.push(row)
        } else {
            uniqueMap.set(key, row.id)
        }
    })

    console.log(`Unique Agents: ${uniqueMap.size}`)
    console.log(`Duplicate Rows: ${duplicates.length}`)
    
    if (duplicates.length > 0) {
        console.log("\nSample Duplicates:")
        duplicates.slice(0, 5).forEach(d => console.log(`- ID: ${d.id} for Agent: ${d.agent_id}`))
    }

    // 2. Check if UNIQUE constraint exists
    const { data: constraints } = await supabase.rpc('get_table_constraints', { t_name: 'agent_availability' })
    // Wait, get_table_constraints might not exist. I'll use a raw query if I can.
}

run()
