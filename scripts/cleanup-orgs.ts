
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

async function cleanupOrgs() {
    console.log('--- STARTING ORG CLEANUP ---')

    // IDs to remove (from previous audit)
    const orgsToRemove = [
        '36512b28-0238-4a37-9033-a6e58652d857', // "My Agency" (Slug: agency-c3b2058f) - The accidental one
        '73214db7-eb17-41e0-96a8-1f8773207e6c', // "Test nuevo reseller" (Slug: test-nuevo-reseller) - Empty
    ]

    for (const orgId of orgsToRemove) {
        console.log(`Checking Org [${orgId}]...`)

        // Safety Check: Leads Count
        const { count, error: countError } = await adminClient
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', orgId)

        if (countError) {
            console.error(`Error checking leads for ${orgId}:`, countError.message)
            continue
        }

        if (count && count > 0) {
            console.warn(`SKIPPING [${orgId}] - Has ${count} leads! (Unsafe delete)`)
            continue
        }

        // Safe to Delete
        console.log(`Deleting Org [${orgId}] (0 leads)...`)

        // 1. Delete Memberships first (cascade might fail if manually handled)
        const { error: memError } = await adminClient
            .from('organization_members')
            .delete()
            .eq('organization_id', orgId)

        if (memError) {
            console.error(`Failed to delete members:`, memError.message)
        } else {
            console.log(`   - Members deleted.`)
        }

        // 2. Delete Org
        const { error: orgError } = await adminClient
            .from('organizations')
            .delete()
            .eq('id', orgId)

        if (orgError) {
            console.error(`Failed to delete org:`, orgError.message)
        } else {
            console.log(`   - ORGANIZATION DELETED SUCCESSFULLY.`)
        }
    }

    console.log('--- CLEANUP COMPLETE ---')
}

cleanupOrgs()
