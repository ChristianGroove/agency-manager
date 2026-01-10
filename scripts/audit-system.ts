
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Environment Variables')
    process.exit(1)
}

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

import fs from 'fs/promises'
import path from 'path'

async function runAudit() {
    let output = '--- STARTING SURGICAL AUDIT ---\n'

    // 1. Organizations
    const { data: orgs, error: orgError } = await adminClient.from('organizations').select('*')
    if (orgError) output += `Error fetching orgs: ${orgError.message}\n`
    output += `\n1. ORGANIZATIONS (${orgs?.length || 0}):\n`
    orgs?.forEach(o => output += `   - [${o.id}] "${o.name}" (Slug: ${o.slug})\n`)

    // 2. Memberships
    const { data: members, error: memError } = await adminClient.from('organization_members').select('*')
    if (memError) output += `Error fetching members: ${memError.message}\n`
    output += `\n2. MEMBERSHIPS (${members?.length || 0}):\n`
    members?.forEach(m => output += `   - User [${m.user_id}] -> Org [${m.organization_id}] (Role: ${m.role})\n`)

    // 3. Leads Distribution
    const { data: leads, error: leadsError } = await adminClient.from('leads').select('organization_id')
    if (leadsError) output += `Error fetching leads: ${leadsError.message}\n`

    const leadsByOrg: Record<string, number> = {}
    let orphanedLeads = 0
    leads?.forEach(l => {
        if (l.organization_id) {
            leadsByOrg[l.organization_id] = (leadsByOrg[l.organization_id] || 0) + 1
        } else {
            orphanedLeads++
        }
    })

    output += `\n3. LEADS DISTRIBUTION (Total: ${leads?.length || 0}):\n`
    Object.entries(leadsByOrg).forEach(([orgId, count]) => {
        const orgName = orgs?.find(o => o.id === orgId)?.name || 'Unknown Org'
        output += `   - Org [${orgId}] (${orgName}): ${count} leads\n`
    })
    if (orphanedLeads > 0) output += `   - ORPHANED (No Org): ${orphanedLeads} leads\n`

    output += '\n--- AUDIT COMPLETE ---\n'

    await fs.writeFile(path.join(process.cwd(), 'audit_result.txt'), output)
    console.log('Audit written to audit_result.txt')
}

runAudit()
