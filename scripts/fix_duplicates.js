const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function deduplicate() {
    console.log("--- DEDUPLICATION START ---")
    
    // 1. Get all rows
    const { data: allRows } = await supabase.from('agent_availability').select('*').order('last_seen_at', { ascending: false })
    
    if (!allRows) {
        console.error("No rows found.")
        return
    }

    const seen = new Set()
    const toDelete = []

    for (const row of allRows) {
        const key = `${row.agent_id}-${row.organization_id}`
        if (seen.has(key)) {
            toDelete.push(row.id)
        } else {
            seen.add(key)
        }
    }

    console.log(`Found ${toDelete.length} duplicates to delete.`)

    if (toDelete.length > 0) {
        const { error } = await supabase.from('agent_availability').delete().in('id', toDelete)
        if (error) {
            console.error("❌ Error deleting duplicates:", error.message)
        } else {
            console.log("✅ Successfully deleted duplicates.")
        }
    } else {
        console.log("No duplicates found.")
    }
}

deduplicate()
