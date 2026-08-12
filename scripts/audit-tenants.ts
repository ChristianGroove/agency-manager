// Impact Analysis Script — Tenant Hierarchy & Owner Audit
// Reads from local Supabase to estimate production impact

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY required. Run with: npx tsx --env-file=.env.local scripts/audit-tenants.ts')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
    console.log('\n🔬 ═══════════════════════════════════════════════════════')
    console.log('   AUDITORÍA DE IMPACTO: Tenant Hierarchy & Owner Assignment')
    console.log('═══════════════════════════════════════════════════════════\n')

    // 1. Fetch all organizations
    const { data: orgs, error: orgsErr } = await supabase
        .from('organizations')
        .select('id, name, slug, organization_type, parent_organization_id, owner_id, acquired_by_reseller_id, status, created_at')
        .order('created_at', { ascending: true })

    if (orgsErr || !orgs) {
        console.error('❌ Error fetching organizations:', orgsErr)
        return
    }

    // 2. Fetch all organization members
    const { data: members, error: membersErr } = await supabase
        .from('organization_members')
        .select('organization_id, user_id, role, status, permissions')

    if (membersErr || !members) {
        console.error('❌ Error fetching members:', membersErr)
        return
    }

    // 3. Fetch all auth users
    const { data: { users }, error: usersErr } = await supabase.auth.admin.listUsers()
    if (usersErr || !users) {
        console.error('❌ Error fetching users:', usersErr)
        return
    }

    const userMap = new Map(users.map(u => [u.id, u]))

    // 4. Find platform org (SuperAdmin org)
    const platformOrg = orgs.find(o => o.organization_type === 'platform')
    const platformOwnerId = platformOrg?.owner_id

    console.log(`📊 Total organizaciones: ${orgs.length}`)
    console.log(`   - Platform: ${orgs.filter(o => o.organization_type === 'platform').length}`)
    console.log(`   - Reseller: ${orgs.filter(o => o.organization_type === 'reseller').length}`)
    console.log(`   - Client:   ${orgs.filter(o => o.organization_type === 'client').length}`)
    console.log(`   - Operator: ${orgs.filter(o => o.organization_type === 'operator').length}`)
    console.log(`   - Sin tipo:  ${orgs.filter(o => !o.organization_type).length}`)

    if (platformOrg && platformOwnerId) {
        const platformUser = userMap.get(platformOwnerId)
        console.log(`\n🛡️  Platform Org: "${platformOrg.name}" (${platformOrg.slug})`)
        console.log(`   Owner ID: ${platformOwnerId}`)
        console.log(`   Owner Email: ${platformUser?.email || 'N/A'}`)
    }

    // ═══════════════════════════════════════════════════════
    // HALLAZGO #1: Tenants cuyo owner_id es el SuperAdmin
    // ═══════════════════════════════════════════════════════
    console.log('\n\n🚨 ═══ HALLAZGO #1: Tenants con owner_id del SuperAdmin ═══')

    const tenantsOwnedBySuperAdmin = orgs.filter(o =>
        o.owner_id === platformOwnerId &&
        o.id !== platformOrg?.id
    )

    if (tenantsOwnedBySuperAdmin.length === 0) {
        console.log('   ✅ Ningún tenant tiene al SuperAdmin como owner_id')
    } else {
        console.log(`   ⚠️  ${tenantsOwnedBySuperAdmin.length} tenant(s) tienen al SuperAdmin como owner_id:\n`)
        for (const t of tenantsOwnedBySuperAdmin) {
            const orgMembers = members.filter(m => m.organization_id === t.id)
            const ownerMembers = orgMembers.filter(m => m.role === 'owner')
            const otherMembers = orgMembers.filter(m => m.role !== 'owner')
            console.log(`   📦 "${t.name}" (${t.slug})`)
            console.log(`      Tipo: ${t.organization_type || 'N/A'} | Estado: ${t.status}`)
            console.log(`      owner_id: ${t.owner_id} (SuperAdmin)`)
            console.log(`      Miembros owner: ${ownerMembers.map(m => userMap.get(m.user_id)?.email || m.user_id).join(', ') || 'ninguno'}`)
            console.log(`      Otros miembros: ${otherMembers.length}`)
            console.log(`      Parent: ${t.parent_organization_id || 'ninguno'}`)
            console.log('')
        }
    }

    // ═══════════════════════════════════════════════════════
    // HALLAZGO #2: Tenants sin owner_id
    // ═══════════════════════════════════════════════════════
    console.log('\n🔍 ═══ HALLAZGO #2: Tenants sin owner_id asignado ═══')

    const tenantsWithoutOwner = orgs.filter(o => !o.owner_id)

    if (tenantsWithoutOwner.length === 0) {
        console.log('   ✅ Todos los tenants tienen owner_id asignado')
    } else {
        console.log(`   ⚠️  ${tenantsWithoutOwner.length} tenant(s) sin owner_id:\n`)
        for (const t of tenantsWithoutOwner) {
            const orgMembers = members.filter(m => m.organization_id === t.id)
            console.log(`   📦 "${t.name}" (${t.slug}) — Tipo: ${t.organization_type} | Miembros: ${orgMembers.length}`)
        }
    }

    // ═══════════════════════════════════════════════════════
    // HALLAZGO #3: SuperAdmin registrado como miembro en tenants hijos
    // ═══════════════════════════════════════════════════════
    console.log('\n\n👤 ═══ HALLAZGO #3: SuperAdmin como miembro en tenants hijos ═══')

    if (platformOwnerId) {
        const superAdminMemberships = members.filter(m =>
            m.user_id === platformOwnerId &&
            m.organization_id !== platformOrg?.id
        )

        if (superAdminMemberships.length === 0) {
            console.log('   ✅ SuperAdmin no está como miembro en ningún tenant hijo')
        } else {
            console.log(`   ⚠️  SuperAdmin tiene ${superAdminMemberships.length} membresía(s) en tenants hijos:\n`)
            for (const m of superAdminMemberships) {
                const org = orgs.find(o => o.id === m.organization_id)
                const isProxy = (m.permissions as any)?.is_support_proxy
                console.log(`   📦 "${org?.name}" (${org?.slug}) — Rol: ${m.role} | is_support_proxy: ${isProxy || false}`)
            }
        }
    }

    // ═══════════════════════════════════════════════════════
    // HALLAZGO #4: Resellers sin membresía en tenants que crearon
    // ═══════════════════════════════════════════════════════
    console.log('\n\n🔗 ═══ HALLAZGO #4: Relación Reseller → Tenant (huérfanos) ═══')

    const resellers = orgs.filter(o => o.organization_type === 'reseller')
    for (const reseller of resellers) {
        const resellerOwner = reseller.owner_id
        const childTenants = orgs.filter(o =>
            o.parent_organization_id === reseller.id ||
            o.acquired_by_reseller_id === reseller.id
        )

        console.log(`\n   🏢 Reseller: "${reseller.name}" (${reseller.slug})`)
        console.log(`      Owner: ${resellerOwner ? (userMap.get(resellerOwner)?.email || resellerOwner) : 'N/A'}`)
        console.log(`      Tenants hijos: ${childTenants.length}`)

        for (const child of childTenants) {
            const resellerMembership = members.find(m =>
                m.organization_id === child.id &&
                m.user_id === resellerOwner
            )
            const childOwner = child.owner_id ? (userMap.get(child.owner_id)?.email || child.owner_id) : 'SIN OWNER'

            console.log(`      └─ "${child.name}" (${child.slug})`)
            console.log(`         Owner real: ${childOwner}`)
            console.log(`         Reseller tiene membresía: ${resellerMembership ? `SÍ (${resellerMembership.role})` : '❌ NO'}`)
        }
    }

    // ═══════════════════════════════════════════════════════
    // HALLAZGO #5: Subscriptions con plan_id hardcoded
    // ═══════════════════════════════════════════════════════
    console.log('\n\n📋 ═══ HALLAZGO #5: Subscriptions con plan_id "resto_space" (hardcoded) ═══')

    const { data: subs } = await supabase
        .from('saas_subscriptions')
        .select('organization_id, plan_id, status')

    const restoSpaceSubs = (subs || []).filter(s => s.plan_id === 'resto_space')
    if (restoSpaceSubs.length === 0) {
        console.log('   ✅ Ninguna suscripción tiene plan_id "resto_space" hardcoded')
    } else {
        console.log(`   ⚠️  ${restoSpaceSubs.length} suscripción(es) con plan_id "resto_space":\n`)
        for (const s of restoSpaceSubs) {
            const org = orgs.find(o => o.id === s.organization_id)
            console.log(`   📦 "${org?.name}" (${org?.slug}) — Status: ${s.status}`)
        }
    }

    // ═══════════════════════════════════════════════════════
    // RESUMEN DE IMPACTO
    // ═══════════════════════════════════════════════════════
    console.log('\n\n📊 ═══════════════════════════════════════════════════════')
    console.log('   RESUMEN DE IMPACTO ESTIMADO')
    console.log('═══════════════════════════════════════════════════════════')
    console.log(`   Total tenants:                          ${orgs.length}`)
    console.log(`   Tenants con owner_id = SuperAdmin:      ${tenantsOwnedBySuperAdmin.length} 🔴`)
    console.log(`   Tenants sin owner_id:                   ${tenantsWithoutOwner.length} 🟡`)
    console.log(`   Resellers totales:                      ${resellers.length}`)

    const totalChildTenants = orgs.filter(o => o.parent_organization_id && o.parent_organization_id !== platformOrg?.id).length
    console.log(`   Tenants hijos de resellers:             ${totalChildTenants}`)

    if (platformOwnerId) {
        const superAdminChildMemberships = members.filter(m =>
            m.user_id === platformOwnerId && m.organization_id !== platformOrg?.id
        ).length
        console.log(`   Membresías del SuperAdmin en hijos:     ${superAdminChildMemberships} 🔴`)
    }

    console.log(`   Subs con "resto_space" hardcoded:       ${restoSpaceSubs.length} 🟡`)
    console.log('\n')
}

main().catch(console.error)
