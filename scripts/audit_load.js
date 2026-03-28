const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function audit() {
    console.log("--- LOAD AUDIT START ---")
    
    // 1. Get all agents
    const { data: agents } = await supabaseAdmin.from('agent_availability').select('agent_id, current_load, organization_id')
    
    if (!agents) return

    for (const a of agents) {
        console.log(`\nAgent: ${a.agent_id}`)
        
        // Count conversations using the SAME criteria as the engine
        const { count: activeCount } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_to', a.agent_id)
            .in('state', ['active'])
            .in('status', ['open', 'snoozed'])

        // Count ALL conversations assigned to this agent (regardless of state/status)
        const { count: totalAssigned } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_to', a.agent_id)

        console.log(`- Cached Load: ${a.current_load}`)
        console.log(`- Active Conversations (state=active, status=open/snoozed): ${activeCount}`)
        console.log(`- Total Assigned (any state): ${totalAssigned}`)
        
        if (a.current_load !== activeCount) {
            console.log(`❌ DISCREPANCY DETECTED! Difference: ${a.current_load - activeCount}`)
        } else {
            console.log(`✅ Matches engine criteria.`)
        }
    }
}

// Mocking supabaseAdmin for the script context
const supabaseAdmin = supabase
audit()
