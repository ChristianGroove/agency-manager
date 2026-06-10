"use server"

import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { createClient } from "@/modules/core/database/supabase-server"
import { revalidatePath } from "next/cache"
import { SaasSubscription, SubscriptionStatus } from "./types"

const PUBLIC_MANUAL_SUBSCRIPTION_ERROR = 'Manual subscription could not be initialized'
const PUBLIC_PAYMENT_METHOD_ERROR = 'Payment method could not be updated'

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeSaasActionError(error: unknown) {
    if (error instanceof Error) {
        return { name: error.name }
    }

    if (error && typeof error === 'object') {
        return {
            code: (error as any).code,
            status: (error as any).status,
            statusCode: (error as any).statusCode,
            hasMessage: typeof (error as any).message === 'string' && (error as any).message.length > 0,
        }
    }

    return { type: typeof error }
}

function logSaasActionError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizeSaasActionError(error))
}

function publicSaasActionError(publicMessage: string, error: unknown) {
    if (isDeployedRuntime()) return publicMessage
    return error instanceof Error ? error.message : publicMessage
}

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
        logSaasActionError('Error fetching SaaS subscription:', error)
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
        logSaasActionError('Error initializing manual subscription:', error)
        return { success: false, error: publicSaasActionError(PUBLIC_MANUAL_SUBSCRIPTION_ERROR, error) }
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
        logSaasActionError('Error updating payment method:', error)
        return { success: false, error: publicSaasActionError(PUBLIC_PAYMENT_METHOD_ERROR, error) }
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
