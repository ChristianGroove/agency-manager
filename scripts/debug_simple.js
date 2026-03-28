const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function run() {
    console.log("--- ASSIGNMENT DIAGNOSIS ---")
    
    // 1. History
    const { data: history } = await supabase
        .from('assignment_history')
        .select(`
            created_at,
            assigned_to,
            assignment_method,
            rule_id,
            conversations(channel, connection_id)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

    console.log("\nLast 10 Assignments:")
    history?.forEach(h => {
        console.log(`- [${h.created_at}] Agent: ${h.assigned_to} | Method: ${h.assignment_method} | Rule: ${h.rule_id}`)
    })

    // 2. Agents
    const { data: agents } = await supabase
        .from('agent_availability')
        .select('*')

    console.log("\nAgent Status:")
    const threshold = new Date(Date.now() - 3 * 60 * 1000)
    
    agents?.forEach(a => {
        const lastSeen = new Date(a.last_seen_at)
        console.log(`\nAgent: ${a.agent_id}`)
        console.log(`- Status: ${a.status} | Enabled: ${a.auto_assign_enabled}`)
        console.log(`- Load: ${a.current_load}/${a.max_capacity}`)
        console.log(`- Last Seen: ${a.last_seen_at} (${lastSeen > threshold ? 'ACTIVE' : 'EXPIRED'})`)
    })
}

run()
