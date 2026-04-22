import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import crypto from "crypto"

/**
 * Service Layer for Billing Module - Payments & Gateways
 * Contains pure business logic and DB interactions.
 */

export interface PaymentGatewayConfig {
    id: string
    gateway_name: 'stripe' | 'mercadopago' | 'paypal' | 'wompi'
    display_name: string
    is_enabled: boolean
    is_live_mode: boolean
    public_key: string | null
    secret_key_ref: string | null
    config: Record<string, any>
    platform_fee_percent: number
    platform_fee_fixed_cents: number
    supports_connect: boolean
    supports_subscriptions: boolean
    supports_invoicing: boolean
    last_tested_at: string | null
    test_result: string | null
}

export async function getPaymentTransactions() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("[PaymentService.getPaymentTransactions] Error:", error)
        return []
    }
    return data
}

export async function registerPayment(invoiceId: string, amount: number, notes?: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Unauthorized" }

    try {
        // 1. Get Invoice
        const { data: invoice } = await supabase.from('invoices').select('*').eq('id', invoiceId).single()
        if (!invoice) throw new Error("Invoice not found")

        // 2. Logic for status
        const newStatus = amount >= invoice.total ? 'PAID' : 'PARTIALLY_PAID'
        const reference = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`

        // 3. Create Transaction
        const payload: any = {
            reference,
            amount_in_cents: Math.round(amount * 100),
            currency: invoice.currency || 'COP',
            status: 'APPROVED',
            invoice_ids: [invoiceId],
            organization_id: orgId,
            metadata: { notes },
            created_at: new Date().toISOString()
        }

        const { error: txError } = await supabaseAdmin.from('payment_transactions').insert(payload)
        if (txError) throw txError

        // 4. Update Invoice
        const { error: invError } = await supabase.from('invoices').update({
            payment_status: newStatus,
            status: newStatus === 'PAID' ? 'paid' : invoice.status
        }).eq('id', invoiceId).eq('organization_id', orgId)
        if (invError) throw invError

        // 5. Hooks & Events (Dynamic Imports)
        try {
            const { logDomainEvent } = await import("@/modules/infrastructure/logging/services/event-logger")
            await logDomainEvent({
                entity_type: 'invoice', entity_id: invoiceId, event_type: 'invoice.payment_registered',
                payload: { invoice_id: invoiceId, amount_paid: amount, new_status: newStatus, reference, notes },
                triggered_by: 'user'
            })

            if (newStatus === 'PAID') {
                await handleProcessEngineTransition(invoiceId, orgId)
            }
        } catch (e) {
            console.warn("Hook execution failed:", e)
        }

        return { success: true }
    } catch (error: any) {
        console.error("[PaymentService.registerPayment] Error:", error)
        return { success: false, error: error.message }
    }
}

async function handleProcessEngineTransition(invoiceId: string, orgId: string) {
    try {
        const supabase = await createClient()
        const { data: invoice } = await supabase.from('invoices').select('*, client:leads!client_id(id)').eq('id', invoiceId).single()
        if (!invoice) return

        let leadId = (invoice as any).lead_id || (invoice as any).metadata?.lead_id
        if (!leadId && invoice.client) {
             const { data: lead } = await supabase.from('leads').select('id').eq('organization_id', orgId).eq('email', (invoice.client as any).email).maybeSingle()
             if (lead) leadId = lead.id
        }

        if (leadId) {
            const { ProcessEngine } = await import('@/modules/features/crm/services/process-engine/engine')
            const instance = await ProcessEngine.getActiveProcess(leadId, 'sale')
            if (instance) {
                const result = await ProcessEngine.transition(instance.id, 'won', 'system', 'Invoice Paid')
                if (result.success) {
                    const { data: mapping } = await supabaseAdmin.from('pipeline_process_map').select('pipeline_stage_id').eq('process_type', 'sale').eq('process_state_key', 'won').eq('organization_id', orgId).maybeSingle()
                    if (mapping) {
                        const { data: stage } = await supabaseAdmin.from('pipeline_stages').select('status_key').eq('id', mapping.pipeline_stage_id).single()
                        if (stage) {
                            await supabaseAdmin.from('leads').update({ status: stage.status_key }).eq('id', leadId)
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error("[PaymentService.handleProcessEngineTransition] Failed:", e)
    }
}

// Gateway Config Logic
export async function getPaymentGateways(): Promise<PaymentGatewayConfig[]> {
    const supabase = await createClient()
    const { data, error } = await supabase.from('payment_gateway_config').select('*').order('gateway_name')
    if (error) return []
    return data as PaymentGatewayConfig[]
}

export async function updatePaymentGateway(gatewayName: string, updates: Partial<PaymentGatewayConfig>) {
    const { error } = await supabaseAdmin.from('payment_gateway_config').update({ ...updates, updated_at: new Date().toISOString() }).eq('gateway_name', gatewayName)
    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function getActivePaymentGateway() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('payment_gateway_config').select('gateway_name, public_key, config').eq('is_enabled', true).single()
    if (error || !data) return null
    return { gateway: data.gateway_name, publicKey: data.public_key || '', config: data.config || {} }
}

export async function createBillingPortalSession() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { error: "Organization not found" }

    if (process.env.STRIPE_SECRET_KEY) {
        console.log(`[PaymentService] Stripe key detected but logic pending.`)
    }

    return { url: "/platform/settings?tab=subscription" }
}

export async function createSubscriptionPaymentTransaction() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No organization context")

    // 1. Get current plan details dynamically
    const { getCurrentOrganizationApp } = await import("@/modules/core/saas/app-data-actions")
    const currentApp = await getCurrentOrganizationApp()

    if (!currentApp?.app) throw new Error("No hay un plan activo configurado para esta organización")

    const app = currentApp.app
    const amount = app.price_monthly || 29
    const currency = 'USD'
    const reference = `SUBSCRIPTION-PAY-${orgId.slice(0, 8)}-${Date.now()}`

    // 2. Generate Integrity Signature (Wompi)
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET || ''
    const amountInCents = amount * 100
    const signatureRaw = `${reference}${amountInCents}${currency}${integritySecret}`
    const signature = crypto.createHash('sha256').update(signatureRaw).digest('hex')

    const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || ''

    // 3. Create Transaction in DB
    const { data: tx, error } = await supabaseAdmin
        .from('payment_transactions')
        .insert({
            organization_id: orgId,
            reference,
            amount_in_cents: amountInCents,
            currency: 'USD',
            status: 'PENDING',
            invoice_ids: [],
            metadata: {
                type: 'subscription_payment',
                concept: `Suscripción Mensual: ${app.name}`,
                app_id: app.id
            }
        })
        .select()
        .single()

    if (error) throw new Error("No se pudo iniciar el pago: " + (error.message || "Unknown error"))

    return {
        success: true,
        reference,
        amountInCents,
        currency,
        publicKey,
        signature,
    }
}
export async function getSubscriptionHistory() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'APPROVED')
        .contains('metadata', { type: 'subscription_payment' })
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error("[PaymentService.getSubscriptionHistory] Error:", error)
        return []
    }

    return data
}

export async function getOrganizationSubscription() {
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return null

    const { data, error } = await supabaseAdmin
        .from('saas_subscriptions')
        .select(`
            *,
            saas_apps:plan_id(name, price_monthly)
        `)
        .eq('organization_id', orgId)
        .maybeSingle()

    if (error) {
        console.error("[PaymentService.getOrganizationSubscription] Error:", error)
        return null
    }

    return data
}

