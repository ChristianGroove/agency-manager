
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const USER_ID = 'c3b2058f-487c-442f-a9a0-c1c7d3fb0883'

async function verify() {
    console.log('Checking availability for user:', USER_ID)

    // 1. Check Organization Membership
    const { data: orgMember, error: orgError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', USER_ID)

    console.log('Org Member:', orgMember)
    if (orgError) console.error('Org Error:', orgError)

    if (!orgMember || orgMember.length === 0) {
        console.log('User has no org membership!')
        return
    }

    const orgId = orgMember[0].organization_id

    // 2. Check Agent Availability
    const { data: agent, error: agentError } = await supabase
        .from('agent_availability')
        .select('*')
        .eq('agent_id', USER_ID)

    console.log('Agent Availability (Direct ID check):', agent)
    if (agentError) console.error('Agent Error:', agentError)

    // 3. Check via Org
    const { data: orgAgents, error: orgAgentsError } = await supabase
        .from('agent_availability')
        .select('*')
        .eq('organization_id', orgId)

    console.log(`Agents in Org ${orgId}:`, orgAgents?.length)
    if (orgAgentsError) console.error('Org Agents Error:', orgAgentsError)

    // 4. Check via Org with JOIN (This is what the app does)
    const { data: orgAgentsJoined, error: orgAgentsJoinError } = await supabase
        .from('agent_availability')
        .select(`
            *,
            users:agent_id (
                email,
                raw_user_meta_data
            )
        `)
        .eq('organization_id', orgId)

    console.log(`Agents in Org ${orgId} (with JOIN):`, JSON.stringify(orgAgentsJoined, null, 2))
    if (orgAgentsJoinError) console.error('Org Agents Join Error:', orgAgentsJoinError)
}

verify()
