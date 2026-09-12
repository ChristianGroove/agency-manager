"use server"
import { requireSuperAdmin } from "@/modules/core/iam/services/platform-roles"
import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"

/**
 * Get all organizations with their SaaS subscription data
 */
export async function getAllPlatformSubscriptions() {
    await requireSuperAdmin()

    const { data, error } = await supabaseAdmin
        .from('organizations')
        .select(`
            id,
            name,
            slug,
            active_app_id,
            saas_subscriptions(
                id,
                status,
                current_period_end,
                payment_gateway,
                last_payment_at,
                custom_price,
                billing_cycle,
                bypass_until,
                admin_notes,
                saas_apps(id, name, price_monthly)
            )
        `)
        .order('name')

    if (error) {
        console.error('Error fetching platform subscriptions:', error)
        return []
    }

    return data || []
}

/**
 * Advanced Admin Action: Update subscription details including bypass and custom prices
 */
export async function adminUpdateSubscription(subscriptionId: string, updates: {
    status?: string
    custom_price?: number | null
    billing_cycle?: string
    bypass_until?: string | null
    admin_notes?: string
}) {
    await requireSuperAdmin()

    // 1. Update the subscription
    const { data: sub, error } = await supabaseAdmin
        .from('saas_subscriptions')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        .select('organization_id')
        .single()

    if (error) throw error

    // 2. Cascade status to organizations table with supabaseAdmin so RLS never blocks it
    if (updates.status && sub?.organization_id) {
        const isSuspended = updates.status === 'canceled' || updates.status === 'suspended'
        const orgStatus = isSuspended ? 'suspended' : 'active'

        const orgUpdatePayload: any = {
            status: orgStatus,
            subscription_status: updates.status,
            suspended_at: isSuspended ? new Date().toISOString() : null,
            suspended_reason: isSuspended ? (updates.admin_notes || 'Suspended via billing admin') : null,
            updated_at: new Date().toISOString()
        }

        const { error: orgError } = await supabaseAdmin
            .from('organizations')
            .update(orgUpdatePayload)
            .eq('id', sub.organization_id)

        if (orgError) {
            console.error('[adminUpdateSubscription] Error updating organization status:', orgError)
            throw orgError
        }
    }

    revalidatePath('/platform/admin')
    revalidatePath('/platform/admin/organizations')
    return { success: true }
}

/**
 * Admin Action: Update Space (App) details including features and pricing plans
 */
export async function adminUpdateSpaceDetails(appId: string, updates: {
    features?: string[]
    pricing_plans?: Record<string, number>
}) {
    await requireSuperAdmin()

    const { error } = await supabaseAdmin
        .from('saas_apps')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', appId)

    if (error) throw error

    revalidatePath('/platform/admin')
    return { success: true }
}

/**
 * Manual action: Update subscription status (Legacy compatibility)
 */
export async function updateSubscriptionStatusAdmin(subscriptionId: string, status: any) {
    await requireSuperAdmin()

    const { data: sub, error } = await supabaseAdmin
        .from('saas_subscriptions')
        .update({
            status,
            updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        .select('organization_id')
        .single()

    if (error) throw error

    if (status && sub?.organization_id) {
        const isSuspended = status === 'canceled' || status === 'suspended'
        await supabaseAdmin
            .from('organizations')
            .update({
                status: isSuspended ? 'suspended' : 'active',
                subscription_status: status,
                suspended_at: isSuspended ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', sub.organization_id)
    }

    revalidatePath('/platform/admin')
    revalidatePath('/platform/admin/organizations')
    return { success: true }
}

/**
 * Admin Action: Manually create a subscription for an organization
 */
export async function adminCreateSubscription(orgId: string, appId: string, initialStatus: string = 'active') {
    await requireSuperAdmin()

    // 1. Verify organization exists and has no active subscription
    const { data: existing } = await supabaseAdmin
        .from('saas_subscriptions')
        .select('id')
        .eq('organization_id', orgId)
        .single()

    if (existing) throw new Error('Esta organización ya tiene una suscripción activa.')

    // 2. Create the subscription
    const { data: sub, error } = await supabaseAdmin
        .from('saas_subscriptions')
        .insert({
            organization_id: orgId,
            plan_id: appId,
            status: initialStatus,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            payment_gateway: 'manual',
            metadata: { created_by_admin: true }
        })
        .select()
        .single()

    if (error) throw error

    // 3. Ensure the organization has the correct active_app_id and status
    await supabaseAdmin
        .from('organizations')
        .update({
            active_app_id: appId,
            subscription_status: initialStatus,
            status: (initialStatus === 'canceled' || initialStatus === 'suspended') ? 'suspended' : 'active',
            updated_at: new Date().toISOString()
        })
        .eq('id', orgId)

    revalidatePath('/platform/admin')
    revalidatePath('/platform/admin/organizations')
    return { success: true, sub }
}

/**
 * Admin Action: Configure Courtesy / Grace Period (Acceso de Cortesía)
 * Sets or removes bypass_until on saas_subscriptions and trial_ends_at on organizations
 */
export async function adminSetCourtesyAccess(
    organizationId: string,
    courtesyUntil: string | null,
    reason?: string
) {
    await requireSuperAdmin()

    // 1. Check if organization exists
    const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('id, name, status, active_app_id')
        .eq('id', organizationId)
        .single()

    if (orgError || !org) throw new Error("Organización no encontrada")

    const isGranting = !!(courtesyUntil && new Date(courtesyUntil) > new Date())

    // 2. Check for existing subscription
    const { data: sub } = await supabaseAdmin
        .from('saas_subscriptions')
        .select('id, status, metadata')
        .eq('organization_id', organizationId)
        .maybeSingle()

    if (sub) {
        // Update existing subscription
        const subUpdates: any = {
            bypass_until: courtesyUntil,
            updated_at: new Date().toISOString()
        }
        if (reason) {
            subUpdates.admin_notes = reason
        }
        if (isGranting && (sub.status === 'canceled' || sub.status === 'suspended' || sub.status === 'past_due')) {
            subUpdates.status = 'active'
        }
        const { error: subUpdateErr } = await supabaseAdmin
            .from('saas_subscriptions')
            .update(subUpdates)
            .eq('id', sub.id)

        if (subUpdateErr) throw subUpdateErr
    } else if (isGranting) {
        // Create complimentary subscription if granting courtesy and none exists
        await supabaseAdmin
            .from('saas_subscriptions')
            .insert({
                organization_id: organizationId,
                plan_id: org.active_app_id || 'app_saas_platform',
                status: 'active',
                bypass_until: courtesyUntil,
                current_period_start: new Date().toISOString(),
                current_period_end: courtesyUntil,
                payment_gateway: 'manual',
                admin_notes: reason || 'Acceso de cortesía concedido por superadmin',
                metadata: { courtesy: true, granted_by_admin: true }
            })
    }

    // 3. Update organization record
    const orgUpdates: any = {
        trial_ends_at: courtesyUntil,
        updated_at: new Date().toISOString()
    }

    if (isGranting) {
        orgUpdates.status = 'active'
        orgUpdates.subscription_status = 'active'
        orgUpdates.suspended_at = null
        orgUpdates.suspended_reason = null
    }

    const { error: orgUpdateErr } = await supabaseAdmin
        .from('organizations')
        .update(orgUpdates)
        .eq('id', organizationId)

    if (orgUpdateErr) throw orgUpdateErr

    // 4. Log admin action
    try {
        await supabaseAdmin.from('organization_audit_log').insert({
            organization_id: organizationId,
            action: isGranting ? 'courtesy_access_granted' : 'courtesy_access_revoked',
            details: {
                courtesy_until: courtesyUntil,
                reason: reason || null
            }
        })
    } catch (e) {
        console.error('[adminSetCourtesyAccess] Audit log error:', e)
    }

    revalidatePath('/platform/admin')
    revalidatePath('/platform/admin/organizations')
    return { success: true }
}

