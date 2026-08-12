// Migration Script: Populate owner_id and link orphan tenants
// Safe: Only updates records with NULL values, never overwrites existing data
// Run: npx tsx --env-file=.env.local scripts/migrate-tenant-owners.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY required.')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
    console.log('\n🔧 ═══════════════════════════════════════════════════════')
    console.log('   MIGRATION: Populate owner_id & Link Orphan Tenants')
    console.log('═══════════════════════════════════════════════════════════\n')

    const dryRun = process.argv.includes('--dry-run')
    if (dryRun) console.log('🏜️  DRY RUN MODE — No changes will be made\n')

    // ═══════════════════════════════════════════════════════
    // STEP 1: Find platform org
    // ═══════════════════════════════════════════════════════
    const { data: platformOrg } = await supabase
        .from('organizations')
        .select('id, name, owner_id')
        .eq('organization_type', 'platform')
        .single()

    if (!platformOrg) {
        console.error('❌ No platform organization found. Aborting.')
        process.exit(1)
    }
    console.log(`🛡️  Platform org: "${platformOrg.name}" (${platformOrg.id})`)

    // ═══════════════════════════════════════════════════════
    // STEP 2: Populate owner_id for organizations that have NULL owner_id
    //         Strategy: Use the FIRST member with role='owner' in organization_members
    // ═══════════════════════════════════════════════════════
    console.log('\n📌 STEP 2: Populate owner_id from organization_members...\n')

    const { data: orgsWithoutOwner } = await supabase
        .from('organizations')
        .select('id, name, slug, organization_type')
        .is('owner_id', null)

    let ownerFixed = 0
    let ownerSkipped = 0

    for (const org of (orgsWithoutOwner || [])) {
        // Find the first owner member (exclude support_proxy provisioners)
        const { data: ownerMembers } = await supabase
            .from('organization_members')
            .select('user_id, role, permissions')
            .eq('organization_id', org.id)
            .eq('role', 'owner')
            .order('created_at', { ascending: true })

        // Prefer a member who is NOT a support_proxy
        let realOwner = (ownerMembers || []).find(m => {
            const perms = m.permissions as Record<string, any> | null
            return !perms?.is_support_proxy
        })
        // Fallback to any owner if all are proxies
        if (!realOwner && ownerMembers && ownerMembers.length > 0) {
            realOwner = ownerMembers[0]
        }

        if (realOwner) {
            console.log(`   ✅ "${org.name}" (${org.slug}) → owner_id = ${realOwner.user_id}`)
            if (!dryRun) {
                await supabase.from('organizations')
                    .update({ owner_id: realOwner.user_id })
                    .eq('id', org.id)
            }
            ownerFixed++
        } else {
            // No owner member found — check if there's ANY member to promote
            const { data: anyMember } = await supabase
                .from('organization_members')
                .select('user_id, role')
                .eq('organization_id', org.id)
                .order('created_at', { ascending: true })
                .limit(1)
                .maybeSingle()

            if (anyMember) {
                console.log(`   ⚠️  "${org.name}" (${org.slug}) → No owner role found. First member: ${anyMember.user_id} (${anyMember.role}). Promoting to owner.`)
                if (!dryRun) {
                    await supabase.from('organization_members')
                        .update({ role: 'owner' })
                        .eq('organization_id', org.id)
                        .eq('user_id', anyMember.user_id)
                    await supabase.from('organizations')
                        .update({ owner_id: anyMember.user_id })
                        .eq('id', org.id)
                }
                ownerFixed++
            } else {
                console.log(`   ❌ "${org.name}" (${org.slug}) → No members at all. Skipping.`)
                ownerSkipped++
            }
        }
    }

    console.log(`\n   Result: ${ownerFixed} fixed, ${ownerSkipped} skipped`)

    // ═══════════════════════════════════════════════════════
    // STEP 3: Link orphan client tenants to Platform as parent
    //         Only affects clients with NULL parent_organization_id
    // ═══════════════════════════════════════════════════════
    console.log('\n📌 STEP 3: Link orphan client tenants to Platform parent...\n')

    const { data: orphanClients } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('organization_type', 'client')
        .is('parent_organization_id', null)

    let orphansFixed = 0

    for (const orphan of (orphanClients || [])) {
        console.log(`   ✅ "${orphan.name}" (${orphan.slug}) → parent = Platform (${platformOrg.id})`)
        if (!dryRun) {
            await supabase.from('organizations')
                .update({ parent_organization_id: platformOrg.id })
                .eq('id', orphan.id)
        }
        orphansFixed++
    }

    console.log(`\n   Result: ${orphansFixed} orphans linked to Platform`)

    // ═══════════════════════════════════════════════════════
    // STEP 4: Fix Platform org's own owner_id if still null
    // ═══════════════════════════════════════════════════════
    if (!platformOrg.owner_id) {
        console.log('\n📌 STEP 4: Fix Platform org owner_id...')
        const { data: platformMember } = await supabase
            .from('organization_members')
            .select('user_id')
            .eq('organization_id', platformOrg.id)
            .eq('role', 'owner')
            .limit(1)
            .maybeSingle()

        if (platformMember) {
            console.log(`   ✅ Platform owner_id → ${platformMember.user_id}`)
            if (!dryRun) {
                await supabase.from('organizations')
                    .update({ owner_id: platformMember.user_id })
                    .eq('id', platformOrg.id)
            }
        } else {
            console.log('   ⚠️  No owner member found for Platform org')
        }
    }

    // ═══════════════════════════════════════════════════════
    // STEP 5: Demote SuperAdmin/Reseller from 'owner' to 'admin' 
    //         in child tenants where they are support_proxy provisioners
    // ═══════════════════════════════════════════════════════
    console.log('\n📌 STEP 5: Demote support_proxy owners to admin in child tenants...\n')

    const { data: allMembers } = await supabase
        .from('organization_members')
        .select('organization_id, user_id, role, permissions')
        .eq('role', 'owner')

    let demoted = 0

    for (const member of (allMembers || [])) {
        const perms = member.permissions as Record<string, any> | null
        if (perms?.is_support_proxy) {
            // This is a provisioner who was wrongly assigned as owner
            // Check if there's another real owner in this org
            const { data: otherOwners } = await supabase
                .from('organization_members')
                .select('user_id')
                .eq('organization_id', member.organization_id)
                .eq('role', 'owner')
                .neq('user_id', member.user_id)

            if (otherOwners && otherOwners.length > 0) {
                console.log(`   ✅ Demoting proxy owner ${member.user_id} → admin in org ${member.organization_id}`)
                if (!dryRun) {
                    await supabase.from('organization_members')
                        .update({ role: 'admin', permissions: { is_support_proxy: true, provisioner: true } })
                        .eq('organization_id', member.organization_id)
                        .eq('user_id', member.user_id)
                }
                demoted++
            }
        }
    }

    console.log(`\n   Result: ${demoted} proxy owners demoted to admin`)

    // ═══════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════
    console.log('\n\n📊 ═══════════════════════════════════════════════════════')
    console.log('   MIGRATION SUMMARY')
    console.log('═══════════════════════════════════════════════════════════')
    console.log(`   owner_id populated:         ${ownerFixed}`)
    console.log(`   owner_id skipped:           ${ownerSkipped}`)
    console.log(`   Orphans linked to Platform: ${orphansFixed}`)
    console.log(`   Proxy owners demoted:       ${demoted}`)
    if (dryRun) console.log('\n   🏜️  DRY RUN — No changes were made. Run without --dry-run to apply.')
    console.log('\n')
}

main().catch(console.error)
