const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function testInsert() {
    console.log("--- MANUAL INSERT TEST ---")
    
    // 1. Get real IDs to satisfy FKs
    const { data: conv } = await supabase.from('conversations').select('id, organization_id, assigned_to').limit(1).single()
    if (!conv) {
        console.error("No conversation found to test with.")
        return
    }

    console.log(`Using Conv: ${conv.id}, Org: ${conv.organization_id}, Agent: ${conv.assigned_to}`)

    const { data, error } = await supabase
        .from('assignment_history')
        .insert({
            organization_id: conv.organization_id,
            conversation_id: conv.id,
            assigned_to: conv.assigned_to || '00000000-0000-0000-0000-000000000000', // Mock if null
            assignment_method: 'test-manual'
        })
        .select()

    if (error) {
        console.error("❌ INSERT FAILED:", error.message)
        console.error("Error Code:", error.code)
        console.error("Details:", error.details)
    } else {
        console.log("✅ INSERT SUCCESS! Result:", data)
    }
}

testInsert()
