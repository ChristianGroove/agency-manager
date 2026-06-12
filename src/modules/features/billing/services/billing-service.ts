import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { Invoice, InvoiceItem } from "@/types"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"

const PUBLIC_BILLING_CREATE_INVOICE_ERROR = "No se pudo crear la factura"
const PUBLIC_BILLING_UPDATE_INVOICE_ERROR = "No se pudo actualizar la factura"
const PUBLIC_BILLING_DELETE_INVOICES_ERROR = "No se pudieron eliminar las facturas"
const PUBLIC_BILLING_REGISTER_SERVICE_ERROR = "No se pudo registrar el servicio"
const PUBLIC_BILLING_DELETE_SERVICES_ERROR = "No se pudieron eliminar los servicios"
const PUBLIC_BILLING_TOGGLE_SERVICE_ERROR = "No se pudo actualizar el servicio"
const PUBLIC_BILLING_PUBLIC_INVOICE_ERROR = "No se pudo cargar la factura"
const PUBLIC_BILLING_INVOICE_NOT_FOUND = "Invoice not found"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeBillingServiceError(error: unknown) {
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

function logBillingServiceError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizeBillingServiceError(error))
}

function billingServiceErrorMessage(error: unknown, publicMessage: string) {
    if (isDeployedRuntime()) return publicMessage
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
        return error.message
    }
    return publicMessage
}

/**
 * Service Layer for Billing Module - Invoices
 * Contains pure business logic and DB interactions.
 */

export async function getInvoices() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('invoices')
        .select(`
            *,
            client:leads(name)
        `)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('date', { ascending: false })

    if (error) {
        logBillingServiceError("[BillingService.getInvoices] Error:", error)
        return []
    }

    return data as unknown as Invoice[]
}

export async function getInvoiceById(id: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return null

    const { data, error } = await supabase
        .from('invoices')
        .select(`
            *,
            client:leads(*),
            emitter:emitters(*)
        `)
        .eq('id', id)
        .eq('organization_id', orgId)
        .single()

    if (error) {
        logBillingServiceError("[BillingService.getInvoiceById] Error:", error)
        return null
    }

    if (!data.emitter) {
        // Fallback to default or any active emitter
        const { data: defaultEmitter } = await supabase
            .from('emitters')
            .select('*')
            .eq('organization_id', orgId)
            .eq('is_default', true)
            .maybeSingle()

        if (defaultEmitter) {
            data.emitter = defaultEmitter
        } else {
            const { data: anyEmitter } = await supabase
                .from('emitters')
                .select('*')
                .eq('organization_id', orgId)
                .is('is_active', true)
                .limit(1)
                .maybeSingle()
            if (anyEmitter) data.emitter = anyEmitter
        }
    }

    return data as unknown as Invoice
}

export async function createInvoice(data: Partial<Invoice> & { items: InvoiceItem[] }) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "No organization context" }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "No authenticated user" }

    try {
        // Core Processing (Unified Billing Logic)
        const { InvoiceMapper } = await import('@/modules/billing/legacy/InvoiceMapper')
        
        let issuer = undefined
        let receiver = undefined

        if (data.emitter_id) {
            const { data: e } = await supabase.from('emitters').select('*').eq('id', data.emitter_id).single()
            if (e) {
                const { EmitterMapper } = await import('@/modules/billing/legacy/EntityMappers')
                issuer = EmitterMapper.legacyToCore(e)
            }
        }

        if (data.client_id) {
            const { data: c } = await supabase.from('leads').select('*').eq('id', data.client_id).single()
            if (c) {
                const { ClientMapper } = await import('@/modules/billing/legacy/EntityMappers')
                receiver = ClientMapper.legacyToCore(c)
            }
        }

        const coreDocument = InvoiceMapper.legacyToCore(data, orgId, user.id, issuer, receiver)
        const { DocumentService } = await import('@/modules/billing/core/services/DocumentService')
        const { GenericAdapter } = await import('@/modules/billing/adapters/generic/GenericAdapter')

        const adapter = new GenericAdapter()
        const documentService = new DocumentService(adapter)
        const processedDocument = await documentService.createDocument(coreDocument)
        const legacyInvoice = InvoiceMapper.coreToLegacy(processedDocument)

        const { items, cycle_id, ...invoiceData } = data
        const payload: any = {
            ...invoiceData,
            organization_id: orgId,
            status: legacyInvoice.status || 'pending',
            items: items,
            total: legacyInvoice.total
        }

        if (cycle_id) payload.billing_cycle_id = cycle_id

        const { data: newInvoice, error } = await supabase.from('invoices').insert(payload).select().single()
        if (error) throw error

        // Handle Billing Cycles for recurring services
        if (cycle_id && newInvoice) {
            const { data: currentCycle } = await supabase
                .from('billing_cycles')
                .update({ status: 'invoiced', invoice_id: newInvoice.id, updated_at: new Date().toISOString() })
                .eq('id', cycle_id)
                .select('end_date, service_id')
                .single()

            if (currentCycle) {
                const { data: service } = await supabase.from('services').select('id, type, frequency, amount').eq('id', currentCycle.service_id).single()
                if (service && service.type === 'recurring' && service.frequency) {
                    const { calculateFrequencyNextDate } = await import('@/modules/features/billing/services/billing-utils')
                    const nextStart = new Date(currentCycle.end_date)
                    const nextEnd = calculateFrequencyNextDate(nextStart, service.frequency)

                    await supabase.from('billing_cycles').insert({
                        service_id: service.id,
                        start_date: nextStart.toISOString(),
                        end_date: nextEnd.toISOString(),
                        due_date: nextEnd.toISOString(),
                        amount: service.amount,
                        status: 'pending'
                    })

                    await supabase.from('services').update({ next_billing_date: nextEnd.toISOString() }).eq('id', service.id)
                }
            }
        }

        return { success: true, data: newInvoice }
    } catch (error: any) {
        logBillingServiceError("[BillingService.createInvoice] Error:", error)
        return { success: false, error: billingServiceErrorMessage(error, PUBLIC_BILLING_CREATE_INVOICE_ERROR) }
    }
}

export async function updateInvoice(id: string, data: Partial<Invoice>) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    const { data: updated, error } = await supabase
        .from('invoices')
        .update(data)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()

    if (error) {
        logBillingServiceError("[BillingService.updateInvoice] Error:", error)
        return { success: false, error: billingServiceErrorMessage(error, PUBLIC_BILLING_UPDATE_INVOICE_ERROR) }
    }
    return { success: true, data: updated }
}

export async function deleteInvoices(ids: string[]) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    const { error } = await supabase
        .from('invoices')
        .update({ status: 'void', deleted_at: new Date().toISOString() })
        .in('id', ids)
        .eq('organization_id', orgId)

    if (error) {
        logBillingServiceError("[BillingService.deleteInvoices] Error:", error)
        return { success: false, error: billingServiceErrorMessage(error, PUBLIC_BILLING_DELETE_INVOICES_ERROR) }
    }
    return { success: true }
}

export async function registerService(data: any) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "No organization context" }

    const { data: service, error } = await supabase
        .from('services')
        .insert({
            ...data,
            organization_id: orgId,
            status: 'active',
            created_at: new Date().toISOString()
        })
        .select()
        .single()

    if (error) {
        logBillingServiceError("[BillingService.registerService] Error:", error)
        return { success: false, error: billingServiceErrorMessage(error, PUBLIC_BILLING_REGISTER_SERVICE_ERROR) }
    }
    return { success: true, data: service }
}

export async function deleteServices(ids: string[]) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    const { error } = await supabase
        .from('services')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids)
        .eq('organization_id', orgId)

    if (error) {
        logBillingServiceError("[BillingService.deleteServices] Error:", error)
        return { success: false, error: billingServiceErrorMessage(error, PUBLIC_BILLING_DELETE_SERVICES_ERROR) }
    }
    return { success: true }
}

export async function toggleServiceStatus(id: string, status: 'active' | 'paused' | 'cancelled') {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    const { data: updated, error } = await supabase
        .from('services')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()

    if (error) {
        logBillingServiceError("[BillingService.toggleServiceStatus] Error:", error)
        return { success: false, error: billingServiceErrorMessage(error, PUBLIC_BILLING_TOGGLE_SERVICE_ERROR) }
    }
    return { success: true, data: updated }
}

export async function getPublicInvoice(id: string) {
    const { data: invoice, error } = await supabaseAdmin
        .from('invoices')
        .select(`*, client:leads(*), emitter:emitters(*)`)
        .eq('id', id)
        .single()

    if (error) {
        logBillingServiceError("[BillingService.getPublicInvoice] Error:", error)
        return { error: billingServiceErrorMessage(error, PUBLIC_BILLING_PUBLIC_INVOICE_ERROR) }
    }

    if (!invoice) return { error: PUBLIC_BILLING_INVOICE_NOT_FOUND }

    if (!invoice.emitter) {
        const { data: defaultEmitter } = await supabaseAdmin
            .from('emitters')
            .select('*')
            .eq('organization_id', invoice.organization_id)
            .eq('is_default', true)
            .maybeSingle()
        if (defaultEmitter) invoice.emitter = defaultEmitter
    }

    const { data: settings } = await supabaseAdmin
        .from('organization_settings')
        .select('*')
        .eq('organization_id', invoice.organization_id)
        .single()

    return { invoice, settings }
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
        logBillingServiceError("[BillingService.getSubscriptionHistory] Error:", error)
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
            saas_apps(name, price_monthly)
        `)
        .eq('organization_id', orgId)
        .maybeSingle()

    if (error) {
        logBillingServiceError("[BillingService.getOrganizationSubscription] Error:", error)
        return null
    }

    return data
}

/**
 * Retrieves all "Master Contacts" (contact_type='client') for the current organization.
 */
export async function getContactOptions() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('leads')
        .select('id, name, company_name, email')
        .eq('organization_id', orgId)
        .eq('contact_type', 'client')
        .is('deleted_at', null)
        .order('name')

    if (error) {
        logBillingServiceError('[BillingService.getContactOptions] Error:', error)
        return []
    }

    return data
}

