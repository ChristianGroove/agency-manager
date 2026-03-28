const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function debugSpecific() {
    console.log("--- SPECIFIC AGENT DIAGNOSIS ---")
    
    // 1. Get rules with specific-agent
    const { data: rules } = await supabase.from('assignment_rules').select('*').eq('strategy', 'specific-agent')
    console.log(`Found ${rules?.length} specific-agent rules.`)
    
    rules?.forEach(r => {
        console.log(`Rule: ${r.name} (${r.id}) | Channel: ${r.channel_type} | Agents: ${r.assign_to}`)
    })

    // 2. Get history for specific-agent
    const { data: history } = await supabase
        .from('assignment_history')
        .select('*')
        .eq('assignment_method', 'specific-agent')
        .order('created_at', { ascending: false })
        .limit(20)

    console.log(`\nLast 20 Specific Agent Assignments:`)
    history?.forEach(h => {
        console.log(`- [${h.created_at}] Agent: ${h.assigned_to} | Rule: ${h.rule_id}`)
    })

    // 3. Count distribution per agent for the last 50 assignments
    const { data: dist } = await supabase
        .from('assignment_history')
        .select('assigned_to')
        .eq('assignment_method', 'specific-agent')
        .order('created_at', { ascending: false })
        .limit(50)

    const counts = {}
    dist?.forEach(d => {
        counts[d.assigned_to] = (counts[d.assigned_to] || 0) + 1
    })
    console.log("\nDistribution (Last 50):", counts)
}

debugSpecific()
