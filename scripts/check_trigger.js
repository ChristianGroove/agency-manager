const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function checkTriggers() {
    console.log("--- TRIGGER CHECK ---")
    
    // Check for a sample conversation that is assigned
    const { data: convs } = await supabase.from('conversations').select('*').not('assigned_to', 'is', null).limit(1)
    if (!convs || convs.length === 0) {
        console.log("No assigned conversations found to test trigger.")
        return
    }

    const conv = convs[0]
    const agentId = conv.assigned_to

    const { data: initialAvailability } = await supabase.from('agent_availability').select('current_load').eq('agent_id', agentId).limit(1).single()
    console.log(`Agent: ${agentId}`)
    console.log(`Initial Load: ${initialAvailability?.current_load}`)

    // 1. Toggle status to trigger recalculation (if using robust trigger)
    const originalStatus = conv.status
    const testStatus = originalStatus === 'open' ? 'snoozed' : 'open'
    
    console.log(`\nTest 1: Updating status from ${originalStatus} to ${testStatus}...`)
    await supabase.from('conversations').update({ status: testStatus }).eq('id', conv.id)
    
    await new Promise(r => setTimeout(r, 2000))
    const { data: midAvailability } = await supabase.from('agent_availability').select('current_load').eq('agent_id', agentId).limit(1).single()
    console.log(`Load after status change: ${midAvailability?.current_load}`)

    // 2. Change state to 'archived' (should definitely decrease load)
    console.log(`\nTest 2: Changing state to 'archived'...`)
    await supabase.from('conversations').update({ state: 'archived' }).eq('id', conv.id)
    
    await new Promise(r => setTimeout(r, 2000))
    const { data: finalAvailability } = await supabase.from('agent_availability').select('current_load').eq('agent_id', agentId).limit(1).single()
    console.log(`Load after archive: ${finalAvailability?.current_load}`)

    if (initialAvailability?.current_load === finalAvailability?.current_load) {
        console.log("\n❌ RESULT: TRIGGER IS NOT WORKING OR NOT INSTALLED.")
    } else {
        console.log("\n✅ RESULT: TRIGGER IS ACTIVE.")
    }

    // CLEANUP
    console.log("\nCleaning up...")
    await supabase.from('conversations').update({ status: originalStatus, state: 'active' }).eq('id', conv.id)
}

checkTriggers()
