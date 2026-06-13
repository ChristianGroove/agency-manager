import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import crypto from "crypto"

const PUBLIC_REGISTER_PAYMENT_ERROR = "No se pudo registrar el pago"
const PUBLIC_GATEWAY_UPDATE_ERROR = "No se pudo actualizar la pasarela de pago"
const PUBLIC_SUBSCRIPTION_PAYMENT_ERROR = "No se pudo iniciar el pago"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizePaymentServiceError(error: unknown) {
    if (error instanceof Error) return { name: error.name }

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

function logPaymentServiceError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizePaymentServiceError(error))
}

function paymentServiceErrorMessage(error: unknown, publicMessage: string) {
    if (isDeployedRuntime()) return publicMessage
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
        return error.message
    }
    return publicMessage
}

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
        const { data: invoice } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', invoiceId)
            .eq('organization_id', orgId)
            .single()
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

        const { error: txError } = await (await createClient()).from('payment_transactions').insert(payload)
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
        logPaymentServiceError("[PaymentService.registerPayment] Error:", error)
        return { success: false, error: paymentServiceErrorMessage(error, PUBLIC_REGISTER_PAYMENT_ERROR) }
    }
}

async function handleProcessEngineTransition(invoiceId: string, orgId: string) {
    try {
        const supabase = await createClient()
        const { data: invoice } = await supabase
            .from('invoices')
            .select('*, client:leads!client_id(id, email)')
            .eq('id', invoiceId)
            .eq('organization_id', orgId)
            .single()
        if (!invoice) return

        let leadId = (invoice as any).lead_id || (invoice as any).metadata?.lead_id
        if (leadId) {
            const { data: lead } = await supabase
                .from('leads')
                .select('id')
                .eq('id', leadId)
                .eq('organization_id', orgId)
                .maybeSingle()
            leadId = lead?.id
        }
        if (!leadId && invoice.client?.id) {
            const { data: lead } = await supabase
                .from('leads')
                .select('id')
                .eq('id', invoice.client.id)
                .eq('organization_id', orgId)
                .maybeSingle()
            if (lead) leadId = lead.id
        }
        if (!leadId && invoice.client?.email) {
             const { data: lead } = await supabase.from('leads').select('id').eq('organization_id', orgId).eq('email', (invoice.client as any).email).maybeSingle()
             if (lead) leadId = lead.id
        }

        if (leadId) {
            const { ProcessEngine } = await import('@/modules/features/crm/services/process-engine/engine')
            const instance = await ProcessEngine.getActiveProcess(leadId, 'sale')
            if (instance) {
                const result = await ProcessEngine.transition(instance.id, 'won', 'system', 'Invoice Paid')
                if (result.success) {
                    const { data: mapping } = await (await createClient()).from('pipeline_process_map').select('pipeline_stage_id').eq('process_type', 'sale').eq('process_state_key', 'won').eq('organization_id', orgId).maybeSingle()
                    if (mapping) {
                        const { data: stage } = await (await createClient()).from('pipeline_stages').select('status_key').eq('id', mapping.pipeline_stage_id).single()
                        if (stage) {
                            await (await createClient()).from('leads').update({ status: stage.status_key }).eq('id', leadId).eq('organization_id', orgId)
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
    const { error } = await (await createClient()).from('payment_gateway_config').update({ ...updates, updated_at: new Date().toISOString() }).eq('gateway_name', gatewayName)
    if (error) {
        logPaymentServiceError("[PaymentService.updatePaymentGateway] Error:", error)
        return { success: false, error: paymentServiceErrorMessage(error, PUBLIC_GATEWAY_UPDATE_ERROR) }
    }
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
    const { data: tx, error } = await (await createClient())
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

    if (error) {
        logPaymentServiceError("[PaymentService.createSubscriptionPaymentTransaction] Error:", error)
        throw new Error(paymentServiceErrorMessage(error, PUBLIC_SUBSCRIPTION_PAYMENT_ERROR))
    }

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

    const { data, error } = await (await createClient())
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

