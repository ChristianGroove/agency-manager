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
        if (updates.email) profileUpdates.email = updates.email
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
            name: string
        }
    }
}

export async function getAdminOrganizations(): Promise<AdminOrganization[]> {
    await requireSuperAdmin()

    const { data, error } = await (await createClient())
        .from('organizations')
        .select(`
            *,
            custom_admin_domain,
            custom_portal_domain,
            use_custom_domains,
            branding_tier_id,
            active_app_id,
            app_activated_at,
            saas_subscriptions(status, current_period_end, bypass_until, saas_apps(name))
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching organizations:', error)
        return []
    }

    // Unpack single subscription if array is returned
    const parsedData = (data || []).map((org: any) => ({
        ...org,
        saas_subscriptions: Array.isArray(org.saas_subscriptions) ? org.saas_subscriptions[0] : org.saas_subscriptions
    }))

    return parsedData as AdminOrganization[]
}

/**
 * Get a single organization by ID
 */
export async function getAdminOrganizationById(organizationId: string): Promise<AdminOrganization | null> {
    await requireSuperAdmin()

    const { data, error } = await (await createClient())
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
    const { data: org, error: orgError } = await (await createClient())
        .from('organizations')
        .select(`*, saas_subscriptions(*)`)
        .eq('id', orgId)
        .single()
    if (orgError) throw orgError

    if (org && Array.isArray(org.saas_subscriptions)) {
        org.saas_subscriptions = org.saas_subscriptions[0]
    }

    const { count: userCount } = await (await createClient()).from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
    const { count: clientCount } = await (await createClient()).from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
    return { organization: org, stats: { users: userCount || 0, clients: clientCount || 0 } }
}

export async function updateOrganizationStatus(orgId: string, status: 'active' | 'suspended' | 'past_due' | 'archived', reason?: string) {
    await requireSuperAdmin()
    const supabase = await createClient()

    const { data: orgCheck } = await supabase.from('organizations').select('slug').eq('id', orgId).single()
    if (!orgCheck || PROTECTED_ORG_SLUGS.includes(orgCheck.slug)) throw new Error(`Cannot modify protected organization`)
    
    const updatePayload: any = {
        status,
        suspended_at: status === 'suspended' ? new Date().toISOString() : null,
        suspended_reason: status === 'suspended' ? reason : null
    }

    if (status === 'active') {
        // Sync subscription status so cron doesn't suspend it on Saturday
        updatePayload.subscription_status = 'active'
        // Optionally extend trial 10 years or clear it if they are marked active
        // But the cron checks `trial_ends_at < NOW() AND subscription_status IS DISTINCT FROM 'active'`
        // Since we set subscription_status = 'active', the cron will skip it!
    }

    const { error } = await supabase.from('organizations').update(updatePayload).eq('id', orgId)
    if (error) throw error

    revalidatePath('/platform/admin')
    return { success: true }
}

export async function updateOrganization(orgId: string, data: { name: string, slug: string, base_app_slug?: string }) {
    await requireSuperAdmin()
    const { error } = await (await createClient()).from('organizations').update({ name: data.name, slug: data.slug, base_app_slug: data.base_app_slug }).eq('id', orgId)
    if (error) throw error
    revalidatePath('/platform/admin/organizations')
    return { success: true }
}

export async function updateAdvancedOrganizationOptions(orgId: string, options: { created_at?: string, new_email?: string, new_password?: string }) {
    await requireSuperAdmin()

    // 1. Get current Org to find Owner
    const { data: org, error: orgError } = await (await createClient()).from('organizations').select('owner_id, created_at').eq('id', orgId).single()
    if (orgError) throw new Error("Org not found")

    // 2. Update created_at if provided
    if (options.created_at && options.created_at !== org.created_at) {
        const { error: tsError } = await (await createClient()).from('organizations').update({ created_at: options.created_at }).eq('id', orgId)
        if (tsError) throw new Error("Error actualizando fecha de creación")
    }

    // 3. Update Auth/Profile details if owner exists
    if (org.owner_id && (options.new_email || options.new_password)) {
        const authUpdates: any = {}
        if (options.new_email) authUpdates.email = options.new_email
        if (options.new_password) authUpdates.password = options.new_password

        const { error: authError } = await (await createClient()).auth.admin.updateUserById(org.owner_id, authUpdates)
        if (authError) throw new Error(`Auth Error: ${authError.message}`)

        if (options.new_email) {
            const { error: profileError } = await (await createClient()).from('profiles').update({ email: options.new_email }).eq('id', org.owner_id)
            if (profileError) throw new Error("Error actualizando perfil")
        }
    }

    revalidatePath('/platform/admin/organizations')
    return { success: true }
}

export async function getSaasProducts() {
    await requireSuperAdmin()
    const { data } = await (await createClient()).from('saas_products').select('*').eq('is_active', true).order('name')
    return data || []
}

export async function getOrganizationUsers(orgId: string) {
    await requireSuperAdmin()
    const { data: members, error } = await (await createClient()).from('organization_members').select('*').eq('organization_id', orgId)
    if (error) throw error
    if (!members?.length) return []
    const userIds = members.map(m => m.user_id)
    const userMap = new Map<string, { email: string }>()
    await Promise.all(userIds.map(async (uid) => {
        const { data: { user } } = await (await createClient()).auth.admin.getUserById(uid)
        if (user) userMap.set(uid, { email: user.email || 'No Email' })
    }))
    const { data: profiles } = await (await createClient()).from('profiles').select('id, platform_role').in('id', userIds)
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
    const { count: totalOrgs } = await (await createClient()).from('organizations').select('*', { count: 'exact', head: true })
    const { count: totalUsers } = await (await createClient()).from('profiles').select('*', { count: 'exact', head: true })
    const { count: activeAlerts } = await (await createClient()).from('system_alerts').select('*', { count: 'exact', head: true }).eq('is_active', true)
    const { data: recentLogs } = await (await createClient()).from('organization_audit_log').select('*').order('created_at', { ascending: false }).limit(10)
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
    const { data, error } = await (await createClient())
        .from('global_dashboard_banners')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching global banners:", error)
        return []
    }
    return data
}

export async function upsertGlobalBanner(bannerData: any) {
    await requireSuperAdmin()

    // Si se está activando un banner, desactivar los demás del mismo space_type
    if (bannerData.is_active) {
        await (await createClient())
            .from('global_dashboard_banners')
            .update({ is_active: false })
            .eq('space_type', bannerData.space_type)
    }

    const { error } = await (await createClient())
        .from('global_dashboard_banners')
        .upsert({ ...bannerData, updated_at: new Date().toISOString() })

    if (error) {
        console.error("Error upserting banner:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/platform/admin')
    revalidatePath('/dashboard')
    return { success: true }
}

export async function toggleBannerActive(id: string, space_type: string, is_active: boolean) {
    await requireSuperAdmin()

    if (is_active) {
        // Desactivar todos los de este space_type primero
        await (await createClient())
            .from('global_dashboard_banners')
            .update({ is_active: false })
            .eq('space_type', space_type)
    }

    const { error } = await (await createClient())
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

    const { error } = await (await createClient())
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
    const { data, error } = await (await createClient())
        .from('organization_audit_log')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) throw error
    
    // Manual join to avoid relationship cache issues
    const performerIds = Array.from(new Set(data.map(log => log.performed_by).filter(id => !!id))) as string[]
    
    if (performerIds.length > 0) {
        const { data: profiles } = await (await createClient())
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
