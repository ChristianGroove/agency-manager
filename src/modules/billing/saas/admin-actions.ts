"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { requireSuperAdmin } from "@/lib/auth/platform-roles"
import { revalidatePath } from "next/cache"

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

    const { error } = await supabaseAdmin
        .from('saas_subscriptions')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)

    if (error) throw error

    revalidatePath('/platform/admin')
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

    const { error } = await supabaseAdmin
        .from('saas_subscriptions')
        .update({
            status,
            updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)

    if (error) throw error

    revalidatePath('/platform/admin')
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

    // 3. Ensure the organization has the correct active_app_id
    await supabaseAdmin
        .from('organizations')
        .update({ active_app_id: appId })
        .eq('id', orgId)

    revalidatePath('/platform/admin')
    return { success: true, sub }
}
