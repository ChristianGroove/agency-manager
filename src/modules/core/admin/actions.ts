'use server'
import { requireSuperAdmin } from "@/modules/core/iam/services/platform-roles"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { EmailService } from "@/modules/features/notifications/email.service"

import { requireOrgRole } from "@/modules/core/iam/services/org-roles"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { createClient } from "@/modules/core/database/supabase-server";
import { supabaseAdmin } from "@/modules/core/database/supabase-admin";

/**
 * =======================
 * ADMIN AUTH ACTIONS
 * =======================
 */

async function requireMetaClientAccess(clientId: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Unauthorized")

    const { data: client, error } = await (await createClient())
        .from('clients')
        .select('organization_id')
        .eq('id', clientId)
        .maybeSingle()
    
    if (error || !client || client.organization_id !== orgId) {
        throw new Error("Unauthorized")
    }

    await requireOrgRole('admin')
}

async function logAdminAction(orgId: string | null, action: string, details: any = {}) {
    try {
        // Use createClient from SSR to get the actual session user
        const { createClient } = await import('@/modules/core/database/supabase-server')
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        await (await createClient()).from('organization_audit_log').insert({
            organization_id: orgId,
            action: action,
            performed_by: user?.id,
            details: details
        })
    } catch (e) {
        console.error(`[ADMIN_ACTION] Error logging action:`, e);
    }
}

export async function inviteOrgOwner(email: string, orgId: string) {
    await requireSuperAdmin()

    const { getAdminUrlAsync } = await import('@/modules/infrastructure/utils/utils')
    const origin = await getAdminUrlAsync('')
    const redirectUrl = await getAdminUrlAsync('/auth/confirm?next=/platform')

    let linkData, linkError;

    const result = await (await createClient()).auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: {
            redirectTo: redirectUrl,
            data: { organization_id: orgId, role: 'owner' }
        }
    })

    linkData = result.data;
    linkError = result.error;

    if (linkError && linkError.message?.includes("already been registered")) {
        const resultExisting = await (await createClient()).auth.admin.generateLink({
            type: 'magiclink',
            email: email,
            options: {
                redirectTo: redirectUrl,
                data: { organization_id: orgId, role: 'owner' }
            }
        })
        linkData = resultExisting.data;
        linkError = resultExisting.error;
    }

    if (linkError || !linkData) {
        throw new Error(`Failed to generate link: ${linkError?.message}`)
    }

    const user = linkData.user
    if (!user) {
        throw new Error('Failed to generate link: User object missing')
    }
    const userId = user.id
    const props = (linkData as any).properties
    const actionLink = props?.action_link
    const verificationType = props?.verification_type || 'invite'
    
    const { getSecureAuthLink } = await import('@/modules/core/iam/services/auth-link-utils')
    const { getAuthRedirectBase } = await import('@/modules/core/iam/services/auth-utils')
    const redirectBase = getAuthRedirectBase()
    const inviteLink = getSecureAuthLink(actionLink, verificationType, redirectBase, '/platform')

    // Send Invite Email via Platform SMTP
    if (inviteLink) {
        await EmailService.send({
            to: email,
            subject: 'Invitación a Pixy - Configura tu Agencia',
            html: `
                <h1>Bienvenido a Pixy</h1>
                <p>Has sido invitado a gestionar una nueva organización.</p>
                <p>Haz clic en el siguiente enlace para aceptar la invitación y configurar tu cuenta:</p>
                <p><a href="${inviteLink}" style="padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; display: inline-block;">Aceptar Invitación</a></p>
                <p style="font-size: 12px; color: #666; margin-top: 24px;">Si no esperabas esta invitación, puedes ignorar este correo.</p>
            `,
            organizationId: 'PLATFORM'
        })
    }

    await (await createClient()).from('profiles').upsert({
        id: userId,
        email: email,
        platform_role: 'user',
        full_name: '',
        updated_at: new Date().toISOString()
    }, { onConflict: 'id', ignoreDuplicates: true })

    const { error: memberError } = await (await createClient())
        .from('organization_members')
        .upsert({
            organization_id: orgId,
            user_id: userId,
            role: 'owner',
        }, { onConflict: 'organization_id,user_id' })

    if (memberError) {
        throw new Error(`Failed to add user to organization: ${memberError.message}`)
    }

    await (await createClient()).from('organizations').update({ owner_id: userId }).eq('id', orgId)
    revalidatePath(`/platform/admin/organizations/${orgId}`)

    return { success: true, userId, inviteLink }
}

export async function removeOrgUser(userId: string, orgId: string) {
    await requireSuperAdmin()
    const { error } = await (await createClient()).from('organization_members').delete().match({ organization_id: orgId, user_id: userId })
    if (error) throw error

    await logAdminAction(orgId, 'remove_user', { target_user_id: userId })

    revalidatePath(`/platform/admin/organizations/${orgId}`)
    return { success: true }
}

/**
 * Admin Action: Reset user password via official recovery flow
 */
export async function adminResetUserPassword(userId: string, orgId: string | null) {
    await requireSuperAdmin()

    // 1. Get user email
    const { data: { user }, error: getError } = await (await createClient()).auth.admin.getUserById(userId)
    if (getError || !user?.email) throw new Error("No se pudo encontrar el correo del usuario")

    // 2. Generate Recovery Link
    const { getAdminUrlAsync } = await import('@/modules/infrastructure/utils/utils')
    const confirmUrl = await getAdminUrlAsync('/auth/confirm?next=/update-password')

    const { data: linkData, error: linkError } = await (await createClient()).auth.admin.generateLink({
        type: 'recovery',
        email: user.email,
        options: { redirectTo: confirmUrl }
    })

    if (linkError || !linkData?.properties?.action_link) {
        throw new Error(`Error al generar link: ${linkError?.message || 'Link missing'}`)
    }

    const { getSecureAuthLink } = await import('@/modules/core/iam/services/auth-link-utils')
    const { getAuthRedirectBase } = await import('@/modules/core/iam/services/auth-utils')
    const actionLink = linkData.properties.action_link
    const recoveryLink = getSecureAuthLink(actionLink, 'recovery', getAuthRedirectBase(), '/update-password')

    // 3. Send Email via PLATFORM context
    const { getAuthRecoveryEmailHtml } = await import('@/modules/infrastructure/notifications/services/email-templates')
    // We fetch platform branding
    const { EmailService } = await import('@/modules/features/notifications/email.service')
    
    // We send it!
    const emailResult = await EmailService.send({
        to: user.email,
        subject: 'Restablecer Contraseña - Pixy Platform',
        html: getAuthRecoveryEmailHtml(recoveryLink, {
            agency_name: 'Pixy',
            primary_color: '#000000',
            secondary_color: '#F205E2',
            logo_url: 'https://pixy.com.co/logo.png',
            website_url: 'https://pixy.com.co'
        }, 'neo'),
        organizationId: 'PLATFORM'
    })

    if (!emailResult.success) {
        throw new Error(`Error enviando correo: ${emailResult.error?.message}`)
    }

    // 4. Trace in Audit Log
    await logAdminAction(orgId, 'reset_password', { 
        target_user_id: userId, 
        target_email: user.email,
        method: 'email_recovery'
    })

    return { success: true }
}

/**
 * Admin Action: Update user profile and auth details
 */
export async function adminUpdateUser(userId: string, orgId: string | null, updates: { 
    email?: string, 
    full_name?: string,
    platform_role?: string 
}) {
    await requireSuperAdmin()

    console.log(`[adminUpdateUser] Updating user ${userId} in org ${orgId}`, updates)
    try {
        // 1. Update Auth if email changed
        if (updates.email) {
            console.log(`[adminUpdateUser] Attempting Auth update to email: ${updates.email}`)
            const { error: authError } = await (await createClient()).auth.admin.updateUserById(userId, {
                email: updates.email,
                email_confirm: true // Force confirm if admin is changing it
            })
            if (authError) {
                console.error(`[adminUpdateUser] Auth Update Error:`, authError)
                throw authError
            }
        }

        // 2. Update Profile
        const profileUpdates: any = {}
        if (updates.full_name !== undefined) profileUpdates.full_name = updates.full_name
        if (updates.platform_role) profileUpdates.platform_role = updates.platform_role
        profileUpdates.updated_at = new Date().toISOString()

        console.log(`[adminUpdateUser] Attempting Profile update:`, profileUpdates)
        const { error: profileError } = await (await createClient())
            .from('profiles')
            .update(profileUpdates)
            .eq('id', userId)

        if (profileError) {
            console.error(`[adminUpdateUser] Profile Update Error:`, profileError)
            throw profileError
        }

        // 3. Log Action
        await logAdminAction(orgId, 'update_user', { 
            target_user_id: userId, 
            updates 
        })

        if (orgId) revalidatePath(`/platform/admin/organizations/${orgId}`)
        return { success: true }
    } catch (err: any) {
        console.error(`[adminUpdateUser] Final Error:`, err)
        throw err
    }
}

const PROTECTED_ORG_SLUGS = ['pixy', 'pixy-agency', 'pixy-pds']

export interface AdminOrganization {
    id: string
    name: string
    slug: string
    status: string
    subscription_status: string
    owner_id: string
    owner_email?: string | null
    owner_name?: string | null
    member_count?: number
    client_count?: number
    connected_channels?: string[]
    created_at: string
    next_billing_date: string | null
    base_app_slug: string | null
    suspended_at: string | null
    suspended_reason: string | null
    use_custom_domains: boolean | null
    custom_admin_domain: string | null
    custom_portal_domain: string | null
    branding_tier_id: string | null
    active_app_id: string | null
    app_activated_at: string | null
    trial_ends_at: string | null
    saas_subscriptions?: {
        status: string
        current_period_end: string
        bypass_until?: string | null
        saas_apps?: {
            id?: string
            name: string
            space_category?: string
            price_monthly?: number
        }
    }
}

export async function getAdminOrganizations(): Promise<AdminOrganization[]> {
    await requireSuperAdmin()

    const { data, error } = await supabaseAdmin
        .from('organizations')
        .select(`
            *,
            custom_admin_domain,
            custom_portal_domain,
            use_custom_domains,
            branding_tier_id,
            active_app_id,
            app_activated_at,
            saas_subscriptions(status, current_period_end, bypass_until, saas_apps(id, name, space_category, price_monthly))
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching organizations:', error)
        return []
    }

    const orgs = data || []
    if (orgs.length === 0) return []

    const orgIds = orgs.map((org: any) => org.id)

    // 1. Build a global Auth User Email map from Supabase Auth Admin API & Profiles
    const userEmailMap: Record<string, { email: string, full_name?: string }> = {}

    try {
        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        if (users) {
            users.forEach(u => {
                if (u.id && u.email) {
                    userEmailMap[u.id] = {
                        email: u.email,
                        full_name: u.user_metadata?.full_name || u.user_metadata?.name || undefined
                    }
                }
            })
        }
    } catch (e) {
        console.error("[getAdminOrganizations] Error fetching auth users fallback:", e)
    }

    // Secondary fallback: query profiles table
    try {
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name')
        if (profiles) {
            profiles.forEach(p => {
                if (p.id && p.full_name && userEmailMap[p.id] && !userEmailMap[p.id].full_name) {
                    userEmailMap[p.id].full_name = p.full_name
                }
            })
        }
    } catch (e) {
        console.error("[getAdminOrganizations] Error fetching profiles:", e)
    }

    // 2. Fetch Organization Members, exact Lead counts, and Integration Connections
    const orgOwnerMap: Record<string, string> = {}
    const memberCountMap: Record<string, number> = {}
    const clientCountMap: Record<string, number> = {}
    const connectedChannelsMap: Record<string, string[]> = {}

    try {
        const [membersRes, channelsRes, leadCounts] = await Promise.all([
            supabaseAdmin.from('organization_members').select('organization_id, user_id, role').in('organization_id', orgIds).limit(10000),
            supabaseAdmin.from('integration_connections').select('organization_id, provider_key, status').in('organization_id', orgIds).neq('status', 'deleted'),
            Promise.all(orgIds.map(async (id: string) => {
                const { count } = await supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', id)
                return { id, count: count || 0 }
            }))
        ])

        if (membersRes.data) {
            membersRes.data.forEach((m: any) => {
                memberCountMap[m.organization_id] = (memberCountMap[m.organization_id] || 0) + 1
                if (m.role === 'owner' || (!orgOwnerMap[m.organization_id] && m.role === 'admin')) {
                    orgOwnerMap[m.organization_id] = m.user_id
                } else if (!orgOwnerMap[m.organization_id]) {
                    orgOwnerMap[m.organization_id] = m.user_id
                }
            })
        }

        if (leadCounts) {
            leadCounts.forEach(c => {
                clientCountMap[c.id] = c.count
            })
        }

        if (channelsRes.data) {
            channelsRes.data.forEach((ch: any) => {
                if (ch.status !== 'deleted') {
                    if (!connectedChannelsMap[ch.organization_id]) {
                        connectedChannelsMap[ch.organization_id] = []
                    }
                    if (!connectedChannelsMap[ch.organization_id].includes(ch.provider_key)) {
                        connectedChannelsMap[ch.organization_id].push(ch.provider_key)
                    }
                }
            })
        }
    } catch (e) {
        console.error("[getAdminOrganizations] Error fetching metrics/members/channels:", e)
    }

    const parsedData = orgs.map((org: any) => {
        const sub = Array.isArray(org.saas_subscriptions) ? org.saas_subscriptions[0] : org.saas_subscriptions
        const ownerUserId = org.owner_id || orgOwnerMap[org.id]
        const ownerProfile = ownerUserId ? userEmailMap[ownerUserId] : null

        // Determine effective status: if subscription is canceled or suspended, or subscription_status is suspended/canceled
        let effectiveStatus = org.status || 'active'
        const isSubSuspended = sub?.status === 'canceled' || sub?.status === 'suspended' || org.subscription_status === 'suspended' || org.subscription_status === 'canceled'
        if (isSubSuspended) {
            effectiveStatus = 'suspended'
        }

        // Lazy self-healing in database if out of sync
        if (org.status !== effectiveStatus) {
            supabaseAdmin.from('organizations').update({
                status: effectiveStatus,
                subscription_status: sub?.status || effectiveStatus,
                updated_at: new Date().toISOString()
            }).eq('id', org.id).then(({ error }: any) => {
                if (error) console.error(`[getAdminOrganizations] Self-healing error for org ${org.id}:`, error)
            })
        }

        return {
            ...org,
            status: effectiveStatus,
            owner_email: ownerProfile?.email || null,
            owner_name: ownerProfile?.full_name || null,
            member_count: memberCountMap[org.id] || 0,
            client_count: clientCountMap[org.id] || 0,
            connected_channels: connectedChannelsMap[org.id] || [],
            saas_subscriptions: sub
        }
    })

    return parsedData as AdminOrganization[]
}

/**
 * Get a single organization by ID
 */
export async function getAdminOrganizationById(organizationId: string): Promise<AdminOrganization | null> {
    await requireSuperAdmin()

    const { data, error } = await supabaseAdmin
        .from('organizations')
        .select(`
            *,
            custom_admin_domain,
            custom_portal_domain,
            use_custom_domains,
            branding_tier_id,
            active_app_id,
            app_activated_at
        `)
        .eq('id', organizationId)
        .single()

    if (error) {
        console.error('Error fetching organization:', error)
        return null
    }

    return data as AdminOrganization
}

export async function getOrganizationDetails(orgId: string) {
    await requireSuperAdmin()
    const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select(`*, saas_subscriptions(*)`)
        .eq('id', orgId)
        .single()
    if (orgError) throw orgError

    if (org && Array.isArray(org.saas_subscriptions)) {
        org.saas_subscriptions = org.saas_subscriptions[0]
    }

    const [userRes, clientRes] = await Promise.all([
        supabaseAdmin.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
    ])
    return { organization: org, stats: { users: userRes.count || 0, clients: clientRes.count || 0 } }
}

export async function updateOrganizationStatus(orgId: string, status: 'active' | 'suspended' | 'past_due' | 'archived', reason?: string) {
    await requireSuperAdmin()

    const { data: orgCheck } = await supabaseAdmin.from('organizations').select('slug').eq('id', orgId).single()
    if (!orgCheck || PROTECTED_ORG_SLUGS.includes(orgCheck.slug)) throw new Error(`Cannot modify protected organization`)
    
    const updatePayload: any = {
        status,
        suspended_at: status === 'suspended' ? new Date().toISOString() : null,
        suspended_reason: status === 'suspended' ? reason : null
    }

    if (status === 'active') {
        updatePayload.subscription_status = 'active'
    } else if (status === 'suspended') {
        updatePayload.subscription_status = 'suspended'
    }

    const { error } = await supabaseAdmin.from('organizations').update(updatePayload).eq('id', orgId)
    if (error) throw error

    // Sync saas_subscriptions status as well
    await supabaseAdmin.from('saas_subscriptions').update({
        status: status === 'suspended' ? 'canceled' : status === 'active' ? 'active' : status,
        updated_at: new Date().toISOString()
    }).eq('organization_id', orgId)

    revalidatePath('/platform/admin')
    revalidatePath('/platform/admin/organizations')
    return { success: true }
}

export async function updateOrganization(orgId: string, data: { name: string, slug: string, base_app_slug?: string }) {
    await requireSuperAdmin()
    const { error } = await supabaseAdmin.from('organizations').update({ name: data.name, slug: data.slug, base_app_slug: data.base_app_slug }).eq('id', orgId)
    if (error) throw error
    revalidatePath('/platform/admin/organizations')
    return { success: true }
}

export async function updateAdvancedOrganizationOptions(orgId: string, options: { created_at?: string, new_email?: string, new_password?: string }) {
    await requireSuperAdmin()

    // 1. Get current Org to find Owner
    const { data: org, error: orgError } = await supabaseAdmin.from('organizations').select('owner_id, created_at').eq('id', orgId).single()
    if (orgError) throw new Error("Org not found")

    // 2. Update created_at if provided
    if (options.created_at && options.created_at !== org.created_at) {
        const { error: tsError } = await supabaseAdmin.from('organizations').update({ created_at: options.created_at }).eq('id', orgId)
        if (tsError) throw new Error("Error actualizando fecha de creación")
    }

    // 3. Update Auth/Profile details if owner exists
    if (org.owner_id && (options.new_email || options.new_password)) {
        const authUpdates: any = {}
        if (options.new_email) authUpdates.email = options.new_email
        if (options.new_password) authUpdates.password = options.new_password

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(org.owner_id, authUpdates)
        if (authError) throw new Error(`Auth Error: ${authError.message}`)
    }

    revalidatePath('/platform/admin/organizations')
    return { success: true }
}

export async function getSaasProducts() {
    await requireSuperAdmin()
    const { data } = await supabaseAdmin.from('saas_products').select('*').eq('is_active', true).order('name')
    return data || []
}

export async function getOrganizationUsers(orgId: string) {
    await requireSuperAdmin()
    const { data: members, error } = await supabaseAdmin.from('organization_members').select('*').eq('organization_id', orgId)
    if (error) throw error
    if (!members?.length) return []
    const userIds = members.map(m => m.user_id)
    const userMap = new Map<string, { email: string }>()
    await Promise.all(userIds.map(async (uid) => {
        try {
            const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(uid)
            if (user) userMap.set(uid, { email: user.email || 'No Email' })
        } catch (e) {
            console.error(`[getOrganizationUsers] Error fetching user ${uid}:`, e)
        }
    }))
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, platform_role').in('id', userIds)
    return members.map(member => ({ ...member, user: { email: userMap.get(member.user_id)?.email || 'Unknown', platform_role: profiles?.find(p => p.id === member.user_id)?.platform_role || 'user' } }))
}

export async function deleteOrganization(orgId: string) {
    await requireSuperAdmin()
    const { data: orgCheck } = await (await createClient()).from('organizations').select('slug').eq('id', orgId).single()
    if (!orgCheck || PROTECTED_ORG_SLUGS.includes(orgCheck.slug)) throw new Error(`Cannot delete protected organization`)
    
    // We use supabaseAdmin because RLS doesn't allow deleting organizations by default
    const { error } = await supabaseAdmin.from('organizations').delete().eq('id', orgId)
    
    if (error) throw error
    revalidatePath('/platform/admin/organizations')
    return { success: true }
}

export async function getAdminDashboardStats() {
    await requireSuperAdmin()
    const { count: totalOrgs } = await supabaseAdmin.from('organizations').select('*', { count: 'exact', head: true })
    const { count: totalUsers } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true })
    const { count: activeAlerts } = await supabaseAdmin.from('system_alerts').select('*', { count: 'exact', head: true }).eq('is_active', true)
    const { data: recentLogs } = await supabaseAdmin.from('organization_audit_log').select('*').order('created_at', { ascending: false }).limit(10)
    return { totalOrgs: totalOrgs || 0, totalUsers: totalUsers || 0, activeAlerts: activeAlerts || 0, recentLogs: recentLogs || [] }
}

export async function getActiveBroadcasts() {
    await requireSuperAdmin()
    return getPublicBroadcasts()
}

/**
 * Public version for the dashboard banner (No Super Admin check required)
 * Authenticated users only.
 */
export async function getPublicBroadcasts() {
    // We use supabaseAdmin to ensure we can read the system alerts regardless of RLS on this specific table,
    // as system alerts are meant to be public/broadcasted to all users.
    const { data } = await (await createClient()).from('system_alerts').select('*').eq('is_active', true).order('created_at', { ascending: false })
    return data || []
}

export async function getAllSystemModules() {
    await requireSuperAdmin()
    const { data } = await (await createClient()).from('system_modules').select('*').order('name')
    return data || []
}

export interface Module360Data {
    module: any
    spaces: any[]
    tenants_override: any[]
    metrics: {
        active_tenants: number
        mrr: number
    }
}

export async function getModules360Data(): Promise<Module360Data[]> {
    await requireSuperAdmin()

    // 1. Get all modules
    const { data: modules } = await (await createClient()).from('system_modules').select('*').order('category')

    // 2. Get all apps (Spaces) with their modules
    const { data: apps } = await (await createClient()).from('saas_apps').select('id, name, slug')
    const { data: appModules } = await (await createClient()).from('saas_app_modules').select('*')

    // 3. Get all active organizations with their overrides and active App
    const { data: orgs } = await (await createClient()).from('organizations')
        .select('id, name, slug, active_app_id, manual_module_overrides')
        .eq('status', 'active')

    if (!modules || !apps || !appModules || !orgs) return []

    // Map apps by ID for quick lookup
    const appsById = apps.reduce((acc, app) => ({ ...acc, [app.id]: app }), {} as Record<string, any>)

    const coreModules = ['core_settings', 'core_clients']

    const result: Module360Data[] = modules.map(mod => {
        // Find spaces that explicitly include this module
        const moduleSpacesLinks = appModules.filter(link => link.module_key === mod.key)
        const spaces = moduleSpacesLinks.map(link => appsById[link.app_id]).filter(Boolean)

        // Find tenants explicitly overriding this module
        const tenants_override = orgs.filter(org => {
            const overrides = (org.manual_module_overrides as string[]) || []
            return overrides.includes(mod.key)
        }).map(org => ({ id: org.id, name: org.name, slug: org.slug }))

        // Calculate active tenants & MRR
        let active_tenants = 0
        if (coreModules.includes(mod.key)) {
            // Core modules are active for ALL active tenants
            active_tenants = orgs.length
        } else {
            // How many tenants have this module via Space or Overrides?
            const spaceIds = spaces.map(s => s.id)
            orgs.forEach(org => {
                const inSpace = org.active_app_id && spaceIds.includes(org.active_app_id)
                const inOverride = tenants_override.some(t => t.id === org.id)
                if (inSpace || inOverride) {
                    active_tenants++
                }
            })
        }

        // Calculate MRR (Price Monthly * Active Tenants)
        const mrr = (mod.price_monthly || 0) * active_tenants

        return {
            module: mod,
            spaces,
            tenants_override,
            metrics: {
                active_tenants,
                mrr
            }
        }
    })

    return result
}

export async function createBroadcast(data: { title: string, message: string, severity: 'info' | 'warning' | 'critical', expires_at?: string }) {
    await requireSuperAdmin()
    const { error } = await (await createClient()).from('system_alerts').insert({ ...data, is_active: true })
    if (error) throw error
    revalidatePath('/platform/admin')
    return { success: true }
}

export const createSystemBroadcast = createBroadcast

export async function dismissBroadcast(alertId: string) {
    await requireSuperAdmin()
    const { error } = await (await createClient()).from('system_alerts').update({ is_active: false }).eq('id', alertId)
    if (error) throw error
    revalidatePath('/platform/admin')
    return { success: true }
}

export const stopBroadcast = dismissBroadcast


export async function updateOrgModuleOverrides(orgId: string, modules: string[]) {
    await requireSuperAdmin()
    const { error } = await (await createClient()).from('organizations').update({ manual_module_overrides: modules }).eq('id', orgId)
    if (error) throw error
    revalidatePath(`/platform/admin/organizations/${orgId}`)
    return { success: true }
}

export async function forceLogoutUser(userId: string) {
    await requireSuperAdmin()
    const { error } = await (await createClient()).auth.admin.signOut(userId)
    if (error) throw new Error("Failed to sign out user")
    return { success: true }
}

function sanitizeMetaConfigForClient(config: Record<string, any> | null) {
    if (!config) return null

    const safeConfig = { ...config }
    const hasAccessToken = Boolean(safeConfig.access_token)
    delete safeConfig.access_token

    return {
        ...safeConfig,
        has_access_token: hasAccessToken,
    }
}

function getOptionalFormString(formData: FormData, key: string) {
    const value = formData.get(key)
    return typeof value === 'string' ? value.trim() : ''
}

export async function getMetaConfig(clientId: string) {
    if (!clientId) return { config: null, error: "Client ID required" }

    try {
        await requireMetaClientAccess(clientId)

        const { data, error } = await (await createClient())
            .from("integration_configs")
            .select("*")
            .eq("client_id", clientId)
            .eq("platform", "meta")
            .maybeSingle()

        if (error) {
            console.error("Error fetching Meta config:", error)
            return { config: null, error: "Error loading config" }
        }

        return { config: sanitizeMetaConfigForClient(data), error: null }
    } catch (error) {
        console.error("Unauthorized Meta config access:", error)
        return { config: null, error: "Unauthorized" }
    }
}

export async function saveMetaConfig(clientId: string, formData: FormData) {
    if (!clientId) return { success: false, error: "Client ID required" }

    try {
        await requireMetaClientAccess(clientId)
    } catch (error) {
        console.error("Unauthorized Meta config save:", error)
        return { success: false, error: "Unauthorized" }
    }

    const submittedAccessToken = getOptionalFormString(formData, "access_token")
    const { data: existing, error: existingError } = await (await createClient())
        .from("integration_configs")
        .select("id, access_token")
        .eq("client_id", clientId)
        .eq("platform", "meta")
        .maybeSingle()

    if (existingError) {
        console.error("Error loading existing Meta config:", existingError)
        return { success: false, error: "Error saving config" }
    }

    const accessToken = submittedAccessToken || existing?.access_token
    if (!accessToken) {
        return { success: false, error: "Access token required" }
    }

    const configData = {
        client_id: clientId,
        platform: "meta",
        access_token: accessToken,
        ad_account_id: getOptionalFormString(formData, "ad_account_id"),
        page_id: getOptionalFormString(formData, "page_id"),
        settings: { show_ads: formData.get("show_ads") === "true", show_social: formData.get("show_social") === "true" },
        updated_at: new Date().toISOString()
    }
    const { error } = existing ? await (await createClient()).from("integration_configs").update(configData).eq("id", existing.id) : await (await createClient()).from("integration_configs").insert(configData)
    if (error) return { success: false, error: "Error saving config" }
    revalidatePath(`/clients/${clientId}`)
    revalidatePath(`/clients/${clientId}`)
    revalidatePath(`/clients/${clientId}`)
    return { success: true }
}

export async function disconnectMetaConfig(clientId: string) {
    if (!clientId) return { success: false, error: "Client ID required" }

    try {
        await requireMetaClientAccess(clientId)
    } catch (error) {
        console.error("Unauthorized Meta disconnect:", error)
        return { success: false, error: "Unauthorized" }
    }

    // We remove the config entirely or just clear the sensitive token/ids?
    // Let's delete the row for clean start.
    const { error } = await (await createClient())
        .from("integration_configs")
        .delete()
        .eq("client_id", clientId)
        .eq("platform", "meta")

    if (error) {
        console.error("Error disconnecting Meta:", error)
        return { success: false, error: "Error al desconectar. Intente nuevamente." }
    }

    revalidatePath(`/clients/${clientId}`)
    return { success: true }
}

export async function getMetaAssets(clientId: string) {
    if (!clientId) return { success: false, error: "Client ID required" }

    try {
        await requireMetaClientAccess(clientId)

        const { data: config } = await (await createClient())
            .from("integration_configs")
            .select("access_token")
            .eq("client_id", clientId)
            .eq("platform", "meta")
            .maybeSingle()

        if (!config?.access_token) {
            return { success: false, error: "No access token found" }
        }

        const { MetaGraphAPI } = await import('@/modules/infrastructure/meta/services/graph-api')
        const metaApi = new MetaGraphAPI()

        const [adAccounts, pages] = await Promise.all([
            metaApi.getAdAccounts(config.access_token),
            metaApi.getConnectedAssets(config.access_token)
        ])

        return {
            success: true,
            data: {
                adAccounts,
                pages
            }
        }
    } catch (error: any) {
        console.error("Error fetching Meta assets:", error)
        return { success: false, error: error.message }
    }
}


export async function getOrgManagerData(orgId: string) {
    await requireSuperAdmin()

    // Dynamic import to avoid circular dependencies if any, though likely safe
    const { getOrganizationActiveModules } = await import('@/modules/core/saas/module-management-actions')

    const [orgDetails, users, activeModules] = await Promise.all([
        getOrganizationDetails(orgId),
        getOrganizationUsers(orgId),
        getOrganizationActiveModules(orgId)
    ])

    return {
        organization: orgDetails.organization,
        stats: {
            ...orgDetails.stats,
            activeModules: activeModules.length
        },
        users: users
    }
}

export async function syncClientAdsMetrics(clientId: string) {
    if (!clientId) return { success: false, error: "Client ID required" }

    try {
        await requireMetaClientAccess(clientId)

        const { data: config } = await (await createClient()).from("integration_configs").select("*").eq("client_id", clientId).eq("platform", "meta").maybeSingle()
        if (!config || !config.access_token || !config.ad_account_id) return { success: false, error: "Faltan credenciales (Token o Ad Account)" }

        const { MetaConnector } = await import('@/modules/infrastructure/meta/services/connector')
        const { AdsService } = await import('@/modules/infrastructure/meta/services/ads-service')

        const connector = new MetaConnector(config.access_token)
        const service = new AdsService(connector)

        // Sync multiple ranges? Ideally just 'last_30d' for the dashboard for now.
        const metrics = await service.getMetrics(config.ad_account_id, 'last_30d')

        const { error } = await (await createClient()).from("meta_ads_metrics").upsert({
            client_id: clientId,
            snapshot_date: new Date().toISOString(),
            spend: String(metrics.spend),
            impressions: String(metrics.impressions),
            clicks: String(metrics.clicks),
            cpc: String(metrics.cpc),
            ctr: String(metrics.ctr),
            roas: String(metrics.roas),
            campaigns: metrics.campaigns
        }, { onConflict: 'client_id' })

        if (error) throw error
        return { success: true }
    } catch (e: any) {
        console.error("Ads Sync Error:", e)
        return { success: false, error: e.message }
    }
}

export async function syncClientSocialMetrics(clientId: string) {
    if (!clientId) return { success: false, error: "Client ID required" }

    try {
        await requireMetaClientAccess(clientId)

        // 1. Get Config
        const { data: config } = await (await createClient())
            .from("integration_configs")
            .select("*")
            .eq("client_id", clientId)
            .eq("platform", "meta")
            .maybeSingle()

        if (!config || !config.access_token || !config.page_id) {
            return { success: false, error: "Faltan credenciales (Token o Page ID)" }
        }

        // 2. Dynamic Import services
        const { MetaConnector } = await import('@/modules/infrastructure/meta/services/connector')
        const { SocialService } = await import('@/modules/infrastructure/meta/services/social-service')

        const connector = new MetaConnector(config.access_token)
        const service = new SocialService(connector)

        // 3. Fetch from Meta
        const metrics = await service.getMetrics(config.page_id)

        // 4. Save to DB Cache
        const { error } = await (await createClient())
            .from("meta_social_metrics")
            .upsert({
                client_id: clientId,
                snapshot_date: new Date().toISOString(), // Use current time as snapshot ID for simplicity, or day. Usually we want latest.
                facebook_data: metrics.facebook,
                instagram_data: metrics.instagram
            }, { onConflict: 'client_id' }) // Just keep latest per client for the "dashboard" view

        if (error) {
            console.error("DB Save Error:", error)
            return { success: false, error: "Error guardando métricas en base de datos" }
        }

        revalidatePath(`/clients/${clientId}`)
        return { success: true }

    } catch (e: any) {
        console.error("Sync Error:", e)
        return { success: false, error: e.message || "Error de sincronización con Meta" }
    }
}

export async function getBrandingTiers() {
    await requireSuperAdmin()
    const { data, error } = await (await createClient())
        .from('branding_tiers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

    if (error) return []
    return data
}

export async function updateOrganizationTier(orgId: string, tierId: string) {
    await requireSuperAdmin()

    // 1. Verify Tier Exists
    const { data: tier, error: tierError } = await (await createClient())
        .from('branding_tiers')
        .select('*')
        .eq('id', tierId)
        .single()

    if (tierError || !tier) {
        throw new Error("Tier inválido o no encontrado")
    }

    // 2. Direct Update
    const { error } = await (await createClient())
        .from('organizations')
        .update({
            branding_tier_id: tierId,
            branding_tier_activated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', orgId)

    if (error) throw error

    // 3. Upsert Add-on Subscription
    await (await createClient())
        .from('organization_add_ons')
        .upsert({
            organization_id: orgId,
            add_on_type: 'branding',
            tier_id: tierId,
            status: 'active',
            price_monthly: tier.price_monthly,
            updated_at: new Date().toISOString()
        }, { onConflict: 'organization_id, add_on_type' })

    revalidatePath(`/platform/admin/organizations/${orgId}`)
    return { success: true }
}

/**
 * =======================
 * GLOBAL DASHBOARD BANNERS
 * =======================
 */

export async function getGlobalBanners() {
    await requireSuperAdmin()
    const { data, error } = await supabaseAdmin
        .from('global_dashboard_banners')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching global banners:", error)
        return []
    }

    // Normalizar si vinieran slides serializados en description como fallback
    const cleanBanners = (data || []).map((b: any) => {
        if ((!b.slides || (Array.isArray(b.slides) && b.slides.length === 0)) && typeof b.description === 'string') {
            const trimmed = b.description.trim()
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                try {
                    const parsed = JSON.parse(trimmed)
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return { ...b, slides: parsed }
                    }
                } catch {}
            }
        }
        return b
    })

    return cleanBanners
}

export async function upsertGlobalBanner(bannerData: any) {
    await requireSuperAdmin()

    // Si se está activando un banner, desactivar los demás del mismo space_type
    if (bannerData.is_active) {
        await supabaseAdmin
            .from('global_dashboard_banners')
            .update({ is_active: false })
            .eq('space_type', bannerData.space_type)
    }

    // Normalizar slides y sincronizar con columnas legacy
    const slides = Array.isArray(bannerData.slides) && bannerData.slides.length > 0
        ? bannerData.slides
        : []

    const firstSlide = slides[0] || null

    const legacyTitle = firstSlide?.title || bannerData.title || 'Nuevo Banner'
    const legacyPhrases = firstSlide?.phrases
        ? firstSlide.phrases.map((p: any) => (typeof p === 'string' ? p : p.text))
        : (Array.isArray(bannerData.description) ? bannerData.description : [bannerData.description || ''])
    const cleanLegacyDesc = legacyPhrases.filter(Boolean)

    let validStartsAt: string | null = null
    if (bannerData.starts_at) {
        try {
            const d = new Date(bannerData.starts_at)
            if (!isNaN(d.getTime())) validStartsAt = d.toISOString()
        } catch {}
    }

    let validExpiresAt: string | null = null
    if (bannerData.expires_at) {
        try {
            const d = new Date(bannerData.expires_at)
            if (!isNaN(d.getTime())) validExpiresAt = d.toISOString()
        } catch {}
    }

    const cleanData: any = {
        ...bannerData,
        title: legacyTitle,
        description: cleanLegacyDesc.length > 0 ? cleanLegacyDesc : ['Mensaje de bienvenida'],
        cta_text: firstSlide ? (firstSlide.cta_text || '') : (bannerData.cta_text || ''),
        cta_url: firstSlide ? (firstSlide.cta_url || '') : (bannerData.cta_url || ''),
        media_type: firstSlide ? (firstSlide.media_type || 'json_lottie') : (bannerData.media_type || 'json_lottie'),
        media_url: firstSlide ? (firstSlide.media_url || '') : (bannerData.media_url || ''),
        layout_pos: firstSlide ? (firstSlide.layout_pos || 'right') : (bannerData.layout_pos || 'right'),
        theme: firstSlide ? (firstSlide.theme || 'brand_primary') : (bannerData.theme || 'brand_primary'),
        slides: slides.length > 0 ? slides : null,
        starts_at: validStartsAt,
        expires_at: validExpiresAt,
        updated_at: new Date().toISOString()
    }

    if (!cleanData.id) {
        delete cleanData.id
    }

    let { data, error } = await supabaseAdmin
        .from('global_dashboard_banners')
        .upsert(cleanData, { onConflict: 'space_type' })
        .select()
        .single()

    // Fallback defensivo en caso de desincronización transitoria de columnas en PostgREST
    if (error && error.message && (error.message.includes('schema cache') || error.message.includes('column') || (error as any).code === 'PGRST204')) {
        console.warn("[upsertGlobalBanner] Detectado desfase de schema cache en PostgREST:", error.message, ". Reintentando con payload resiliente...")
        const fallbackData = { ...cleanData }
        if (error.message.includes('slides') || !fallbackData.slides) {
            fallbackData.description = JSON.stringify(slides)
            delete fallbackData.slides
        }
        delete fallbackData.starts_at
        delete fallbackData.expires_at
        const retry = await supabaseAdmin
            .from('global_dashboard_banners')
            .upsert(fallbackData, { onConflict: 'space_type' })
            .select()
            .single()
        data = retry.data
        error = retry.error
    }

    if (error) {
        console.error("Error upserting banner:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/platform/admin')
    revalidatePath('/dashboard')
    return { success: true, data }
}

export async function toggleBannerActive(id: string, space_type: string, is_active: boolean) {
    await requireSuperAdmin()

    if (is_active) {
        // Desactivar todos los de este space_type primero
        await supabaseAdmin
            .from('global_dashboard_banners')
            .update({ is_active: false })
            .eq('space_type', space_type)
    }

    const { error } = await supabaseAdmin
        .from('global_dashboard_banners')
        .update({ is_active })
        .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/platform/admin')
    revalidatePath('/dashboard')
    return { success: true }
}

export async function deleteGlobalBanner(id: string) {
    await requireSuperAdmin()

    const { error } = await supabaseAdmin
        .from('global_dashboard_banners')
        .delete()
        .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/platform/admin')
    revalidatePath('/dashboard')
    return { success: true }
}

/**
 * Fetch audit logs for a specific organization
 */
export async function getOrganizationAuditLogs(orgId: string) {
    await requireSuperAdmin()
    const { data, error } = await supabaseAdmin
        .from('organization_audit_log')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) throw error
    
    // Manual join to avoid relationship cache issues
    const performerIds = Array.from(new Set(data.map(log => log.performed_by).filter(id => !!id))) as string[]
    
    if (performerIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name')
            .in('id', performerIds)
        
        const profileMap = Object.fromEntries(profiles?.map(p => [p.id, p]) || [])
        return data.map(log => ({
            ...log,
            performer: log.performed_by ? profileMap[log.performed_by] : null
        }))
    }

    return data
}
export async function getIntelligenceMetrics() {
    await requireSuperAdmin()
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 7); // Let's do 7 days for more interesting data
    
    // 1. Total usage by engine (Last 7d)
    const { data: engineUsage } = await (await createClient())
        .from('usage_events')
        .select('engine, quantity')
        .gte('occurred_at', yesterday.toISOString());
    
    // 2. Top tenants by AI usage (Last 7d)
    const { data: tenantUsage } = await (await createClient())
        .from('usage_events')
        .select('organization_id, quantity')
        .eq('engine', 'ai')
        .gte('occurred_at', yesterday.toISOString());

    // Aggregate data
    const engineStats = (engineUsage || []).reduce((acc: any, curr: any) => {
        acc[curr.engine] = (acc[curr.engine] || 0) + (curr.quantity || 0);
        return acc;
    }, {});

    const tenantStats = (tenantUsage || []).reduce((acc: any, curr: any) => {
        acc[curr.organization_id] = (acc[curr.organization_id] || 0) + (curr.quantity || 0);
        return acc;
    }, {});

    // Sort tenants and get top 5
    const topTenants = Object.entries(tenantStats)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 5)
        .map(([id, quantity]: [string, any]) => ({ id, quantity }));

    // Get tenant names for the top ones
    const tenantIds = topTenants.map(t => t.id);
    let topTenantsWithNames: any[] = [];

    if (tenantIds.length > 0) {
        const { data: orgNames } = await (await createClient())
            .from('organizations')
            .select('id, name')
            .in('id', tenantIds);

        topTenantsWithNames = topTenants.map(t => ({
            ...t,
            name: orgNames?.find(on => on.id === t.id)?.name || 'Unknown'
        }));
    }

    return {
        engineStats,
        topTenants: topTenantsWithNames,
        totalTokens: (engineUsage || []).filter(e => e.engine === 'ai').reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0)
    };
}

/**
 * ==========================================
 * AI GOVERNANCE & MASTER KEY VAULT ACTIONS
 * ==========================================
 */

export interface MasterKeyItem {
    id: string
    providerId: 'openai' | 'anthropic' | 'google' | 'groq'
    providerName: string
    label?: string
    apiKeyMasked: string
    priority: number
    status: 'active' | 'inactive'
    source: 'vault' | 'env'
    createdAt: string
    models: string[]
}

export type MasterAICredentialInfo = MasterKeyItem

export interface TenantAIGovernance {
    id: string
    name: string
    slug: string
    orgStatus: string
    aiMode: 'saas' | 'byok' | 'disabled'
    aiStatus: 'active' | 'suspended'
    monthlyLimit: number // -1 means unlimited
    currentUsage: number
    byokKeysCount: number
}

const MASTER_PROVIDERS_META: Record<string, { name: string; description: string; envKeyName: string; models: string[] }> = {
    openai: {
        name: 'OpenAI',
        description: 'GPT-4o, GPT-4o-mini y Embeddings vectoriales (text-embedding-3-small)',
        envKeyName: 'OPENAI_API_KEY',
        models: ['gpt-4o', 'gpt-4o-mini', 'text-embedding-3-small']
    },
    anthropic: {
        name: 'Anthropic Claude',
        description: 'Claude 3.5 Sonnet y Claude 3 Haiku para redacción avanzada y análisis',
        envKeyName: 'ANTHROPIC_API_KEY',
        models: ['claude-3-5-sonnet-20240620', 'claude-3-haiku-20240307']
    },
    google: {
        name: 'Google Gemini',
        description: 'Gemini 1.5 Flash y Gemini 1.5 Pro con soporte multimodal extendido',
        envKeyName: 'GEMINI_API_KEY',
        models: ['gemini-1.5-flash', 'gemini-1.5-pro']
    },
    groq: {
        name: 'Groq (Llama)',
        description: 'Inferencia ultra-rápida con Llama 3.3 70B y Mixtral',
        envKeyName: 'GROQ_API_KEY',
        models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']
    }
}

export async function getMasterAICredentials(): Promise<MasterKeyItem[]> {
    await requireSuperAdmin()

    // 1. Fetch from ai_settings (global/system)
    const { data: settings } = await supabaseAdmin
        .from('ai_settings')
        .select('model_overrides')
        .eq('scope_type', 'global')
        .eq('scope_id', 'system')
        .maybeSingle()

    const masterKeysRaw = (settings?.model_overrides as any)?.master_keys
    const items: MasterKeyItem[] = []

    if (Array.isArray(masterKeysRaw)) {
        masterKeysRaw.forEach((mk: any, idx: number) => {
            const meta = MASTER_PROVIDERS_META[mk.providerId] || {
                name: mk.providerId,
                description: '',
                envKeyName: '',
                models: []
            }

            items.push({
                id: mk.id || `master-${mk.providerId}-${idx}`,
                providerId: mk.providerId,
                providerName: meta.name,
                label: mk.label || `${meta.name} Clave #${idx + 1}`,
                apiKeyMasked: '●●●●●●●● (Master Vault DB)',
                priority: mk.priority || idx + 1,
                status: mk.status === 'inactive' ? 'inactive' : 'active',
                source: 'vault',
                createdAt: mk.createdAt || new Date().toISOString(),
                models: meta.models
            })
        })
    } else if (masterKeysRaw && typeof masterKeysRaw === 'object') {
        Object.entries(masterKeysRaw).forEach(([provId, encVal], idx) => {
            if (encVal) {
                const meta = MASTER_PROVIDERS_META[provId] || { name: provId, description: '', envKeyName: '', models: [] }
                items.push({
                    id: `master-legacy-${provId}`,
                    providerId: provId as any,
                    providerName: meta.name,
                    label: `${meta.name} Clave Principal`,
                    apiKeyMasked: '●●●●●●●● (Master Vault DB)',
                    priority: idx + 1,
                    status: 'active',
                    source: 'vault',
                    createdAt: new Date().toISOString(),
                    models: meta.models
                })
            }
        })
    }

    // Check env fallbacks for unconfigured providers
    for (const [provId, meta] of Object.entries(MASTER_PROVIDERS_META)) {
        const envVal = process.env[meta.envKeyName]
        const hasVaultKey = items.some(i => i.providerId === provId && i.source === 'vault')

        if (!hasVaultKey && envVal && envVal.length > 5) {
            items.push({
                id: `env-${provId}`,
                providerId: provId as any,
                providerName: meta.name,
                label: `${meta.name} (Servidor ENV)`,
                apiKeyMasked: `${envVal.slice(0, 4)}...${envVal.slice(-4)} (ENV)`,
                priority: 99,
                status: 'active',
                source: 'env',
                createdAt: new Date().toISOString(),
                models: meta.models
            })
        }
    }

    return items.sort((a, b) => a.priority - b.priority)
}

export async function addMasterAICredential(providerId: string, apiKey: string, label?: string) {
    await requireSuperAdmin()

    if (!apiKey || apiKey.trim().length === 0) {
        throw new Error('La clave API no puede estar vacía')
    }

    const { encrypt } = await import('@/modules/infrastructure/ai-engine/encryption')
    const encryptedKey = encrypt(apiKey.trim())

    const { data: existing } = await supabaseAdmin
        .from('ai_settings')
        .select('*')
        .eq('scope_type', 'global')
        .eq('scope_id', 'system')
        .maybeSingle()

    const currentOverrides = (existing?.model_overrides as any) || {}
    let masterKeys: any[] = []

    if (Array.isArray(currentOverrides.master_keys)) {
        masterKeys = [...currentOverrides.master_keys]
    } else if (currentOverrides.master_keys && typeof currentOverrides.master_keys === 'object') {
        masterKeys = Object.entries(currentOverrides.master_keys).map(([pId, val], i) => ({
            id: `master-${pId}-${i + 1}`,
            providerId: pId,
            apiKeyEncrypted: val,
            label: `Clave Principal`,
            priority: i + 1,
            status: 'active',
            createdAt: new Date().toISOString()
        }))
    }

    const newPriority = masterKeys.length + 1
    const meta = MASTER_PROVIDERS_META[providerId]
    const defaultLabel = `${meta?.name || providerId} Clave #${masterKeys.filter(k => k.providerId === providerId).length + 1}`
    const newKeyId = `master-${providerId}-${Date.now()}`

    masterKeys.push({
        id: newKeyId,
        providerId,
        apiKeyEncrypted: encryptedKey,
        label: label?.trim() || defaultLabel,
        priority: newPriority,
        status: 'active',
        createdAt: new Date().toISOString()
    })

    const newOverrides = {
        ...currentOverrides,
        master_keys: masterKeys
    }

    if (existing) {
        const { error } = await supabaseAdmin
            .from('ai_settings')
            .update({ model_overrides: newOverrides })
            .eq('id', existing.id)
        if (error) throw error
    } else {
        const { error } = await supabaseAdmin
            .from('ai_settings')
            .insert({
                scope_type: 'global',
                scope_id: 'system',
                model_overrides: newOverrides,
                is_clawdbot_enabled: true
            })
        if (error) throw error
    }

    await logAdminAction(null, 'add_master_ai_key', { provider: providerId, id: newKeyId })
    revalidatePath('/platform/admin')
    return { success: true, id: newKeyId }
}

export async function deleteMasterAICredential(keyId: string) {
    await requireSuperAdmin()

    const { data: existing } = await supabaseAdmin
        .from('ai_settings')
        .select('*')
        .eq('scope_type', 'global')
        .eq('scope_id', 'system')
        .maybeSingle()

    if (!existing) return { success: true }

    const currentOverrides = (existing.model_overrides as any) || {}
    let masterKeys: any[] = []

    if (Array.isArray(currentOverrides.master_keys)) {
        masterKeys = currentOverrides.master_keys.filter((mk: any) => mk.id !== keyId)
    } else if (currentOverrides.master_keys && typeof currentOverrides.master_keys === 'object') {
        const keysObj = { ...currentOverrides.master_keys }
        delete keysObj[keyId]
        masterKeys = Object.entries(keysObj).map(([pId, val], i) => ({
            id: `master-${pId}-${i + 1}`,
            providerId: pId,
            apiKeyEncrypted: val,
            priority: i + 1,
            status: 'active'
        }))
    }

    // Re-index priorities 1..N
    masterKeys = masterKeys.map((mk, idx) => ({ ...mk, priority: idx + 1 }))

    const { error } = await supabaseAdmin
        .from('ai_settings')
        .update({
            model_overrides: {
                ...currentOverrides,
                master_keys: masterKeys
            }
        })
        .eq('id', existing.id)

    if (error) throw error

    await logAdminAction(null, 'delete_master_ai_key', { keyId })
    revalidatePath('/platform/admin')
    return { success: true }
}

export async function updateMasterAIPriority(items: { id: string; priority: number }[]) {
    await requireSuperAdmin()

    const { data: existing } = await supabaseAdmin
        .from('ai_settings')
        .select('*')
        .eq('scope_type', 'global')
        .eq('scope_id', 'system')
        .maybeSingle()

    if (!existing) return { success: true }

    const currentOverrides = (existing.model_overrides as any) || {}
    if (!Array.isArray(currentOverrides.master_keys)) return { success: true }

    const priorityMap = new Map<string, number>()
    items.forEach(i => priorityMap.set(i.id, i.priority))

    const updatedKeys = currentOverrides.master_keys.map((mk: any) => ({
        ...mk,
        priority: priorityMap.has(mk.id) ? priorityMap.get(mk.id)! : mk.priority
    })).sort((a: any, b: any) => a.priority - b.priority)

    const { error } = await supabaseAdmin
        .from('ai_settings')
        .update({
            model_overrides: {
                ...currentOverrides,
                master_keys: updatedKeys
            }
        })
        .eq('id', existing.id)

    if (error) throw error

    await logAdminAction(null, 'reorder_master_ai_keys', { count: items.length })
    revalidatePath('/platform/admin')
    return { success: true }
}

export async function toggleMasterKeyStatus(keyId: string, status: 'active' | 'inactive') {
    await requireSuperAdmin()

    const { data: existing } = await supabaseAdmin
        .from('ai_settings')
        .select('*')
        .eq('scope_type', 'global')
        .eq('scope_id', 'system')
        .maybeSingle()

    if (!existing) return { success: true }

    const currentOverrides = (existing.model_overrides as any) || {}
    if (!Array.isArray(currentOverrides.master_keys)) return { success: true }

    const updatedKeys = currentOverrides.master_keys.map((mk: any) =>
        mk.id === keyId ? { ...mk, status } : mk
    )

    const { error } = await supabaseAdmin
        .from('ai_settings')
        .update({
            model_overrides: {
                ...currentOverrides,
                master_keys: updatedKeys
            }
        })
        .eq('id', existing.id)

    if (error) throw error

    await logAdminAction(null, 'toggle_master_ai_key_status', { keyId, status })
    revalidatePath('/platform/admin')
    return { success: true }
}

export async function getTenantsAIGovernance(): Promise<TenantAIGovernance[]> {
    await requireSuperAdmin()

    // 1. Fetch all organizations
    const { data: orgs, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('id, name, slug, status, rate_limit_config')
        .order('name', { ascending: true })

    if (orgError || !orgs) {
        console.error('Error fetching organizations for AI governance:', orgError)
        return []
    }

    // 2. Fetch AI monthly usage limits
    const { data: limits } = await supabaseAdmin
        .from('usage_limits')
        .select('organization_id, limit_value')
        .eq('engine', 'ai')
        .eq('period', 'month')

    const limitsMap = new Map<string, number>()
    limits?.forEach(l => limitsMap.set(l.organization_id, l.limit_value))

    // 3. Fetch current month usage counters
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const { data: counters } = await supabaseAdmin
        .from('usage_counters')
        .select('organization_id, used')
        .eq('engine', 'ai')
        .eq('period', 'month')
        .eq('period_start', monthStart)

    const countersMap = new Map<string, number>()
    counters?.forEach(c => countersMap.set(c.organization_id, c.used))

    // 4. Fetch BYOK credentials count per tenant
    const { data: creds } = await supabaseAdmin
        .from('ai_credentials')
        .select('organization_id')
        .eq('status', 'active')

    const credsCountMap = new Map<string, number>()
    creds?.forEach(c => {
        credsCountMap.set(c.organization_id, (credsCountMap.get(c.organization_id) || 0) + 1)
    })

    return orgs.map(org => {
        const config = (org.rate_limit_config as Record<string, any>) || {}
        const aiMode: 'saas' | 'byok' | 'disabled' = config.ai_mode || 'byok'
        const aiStatus: 'active' | 'suspended' = config.ai_status || 'active'
        const monthlyLimit = limitsMap.has(org.id) ? limitsMap.get(org.id)! : 100000
        const currentUsage = countersMap.get(org.id) || 0
        const byokKeysCount = credsCountMap.get(org.id) || 0

        return {
            id: org.id,
            name: org.name || 'Sin nombre',
            slug: org.slug || '',
            orgStatus: org.status || 'active',
            aiMode,
            aiStatus,
            monthlyLimit,
            currentUsage,
            byokKeysCount
        }
    })
}

export async function updateTenantAIGovernance(
    orgId: string,
    updates: {
        ai_mode?: 'saas' | 'byok' | 'disabled'
        ai_status?: 'active' | 'suspended'
        monthly_limit?: number
    }
) {
    await requireSuperAdmin()

    // 1. Update rate_limit_config in organizations
    const { data: org, error: orgFetchError } = await supabaseAdmin
        .from('organizations')
        .select('rate_limit_config')
        .eq('id', orgId)
        .single()

    if (orgFetchError) throw orgFetchError

    const currentConfig = (org?.rate_limit_config as Record<string, any>) || {}
    const updatedConfig = {
        ...currentConfig,
        ...(updates.ai_mode !== undefined && { ai_mode: updates.ai_mode }),
        ...(updates.ai_status !== undefined && { ai_status: updates.ai_status })
    }

    const { error: orgUpdateError } = await supabaseAdmin
        .from('organizations')
        .update({ rate_limit_config: updatedConfig })
        .eq('id', orgId)

    if (orgUpdateError) throw orgUpdateError

    // 2. Update monthly limit if provided
    if (updates.monthly_limit !== undefined) {
        const { error: limitError } = await supabaseAdmin
            .from('usage_limits')
            .upsert({
                organization_id: orgId,
                engine: 'ai',
                period: 'month',
                limit_value: updates.monthly_limit
            }, {
                onConflict: 'organization_id,engine,period'
            })

        if (limitError) throw limitError
    }

    await logAdminAction(orgId, 'update_ai_governance', updates)
    revalidatePath('/platform/admin')
    return { success: true }
}
