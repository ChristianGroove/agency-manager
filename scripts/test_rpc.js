const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function testRpc() {
    console.log("--- ATOMIC RPC TEST ---")
    
    // Get an organization ID
    const { data: orgs } = await supabase.from('organizations').select('id').limit(1)
    if (!orgs || orgs.length === 0) return

    const orgId = orgs[0].id

    const { data, error } = await supabase.rpc('fn_get_next_agent_atomic', {
        p_org_id: orgId,
        p_strategy: 'load-balance'
    })

    if (error) {
        console.error("❌ RPC fn_get_next_agent_atomic FAILED:", error.message)
    } else {
        console.log("✅ RPC fn_get_next_agent_atomic SUCCESS! Result:", data)
    }
}

testRpc()
