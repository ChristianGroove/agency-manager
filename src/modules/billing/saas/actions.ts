"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { SaasSubscription, SubscriptionStatus } from "./types"

/**
 * Get organization's SaaS subscription status
 */
export async function getSaasSubscription(organizationId: string): Promise<SaasSubscription | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('saas_subscriptions')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle()

    if (error) {
        console.error('Error fetching SaaS subscription:', error)
        return null
    }

    return data as SaasSubscription | null
}

/**
 * Initialize a manual/legacy subscription for existing clients
 * This is used for the 2 existing manual clients.
 */
export async function initializeManualSubscription(organizationId: string, planId: string) {
    // Only SuperAdmin or System can do this
    const { data, error } = await supabaseAdmin
        .from('saas_subscriptions')
        .upsert({
            organization_id: organizationId,
            plan_id: planId,
            status: 'legacy_manual',
            payment_gateway: 'manual',
            current_period_start: new Date().toISOString(),
            metadata: { initialized_by: 'system_migration' }
        })
        .select()
        .single()

    if (error) {
        console.error('Error initializing manual subscription:', error)
        return { success: false, error: error.message }
    }

    revalidatePath(`/platform/admin/organizations/${organizationId}`)
    return { success: true, data }
}

/**
 * Update payment method (Token) for a subscription
 */
export async function updateSubscriptionPaymentMethod(
    organizationId: string,
    paymentMethodId: string,
    gateway: 'wompi' | 'stripe' = 'wompi'
) {
    const { error } = await supabaseAdmin
        .from('saas_subscriptions')
        .update({
            payment_method_id: paymentMethodId,
            payment_gateway: gateway,
            updated_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId)

    if (error) {
        console.error('Error updating payment method:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

/**
 * Simple billing guard: Check if organization has active access
 */
export async function checkOrganizationAccess(organizationId: string): Promise<boolean> {
    const subscription = await getSaasSubscription(organizationId)

    if (!subscription) return false

    const allowedStatuses: SubscriptionStatus[] = ['active', 'trialing', 'legacy_manual'];
    return allowedStatuses.includes(subscription.status);
}
