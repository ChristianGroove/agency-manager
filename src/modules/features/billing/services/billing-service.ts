import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { Invoice, InvoiceItem } from "@/types"
import { supabaseAdmin } from "@/lib/supabase-admin"

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
        console.error("[BillingService.getInvoices] Error:", error)
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
        console.error("[BillingService.getInvoiceById] Error:", error)
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
                    const { calculateFrequencyNextDate } = await import('@/lib/billing-utils')
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
        console.error("[BillingService.createInvoice] Error:", error)
        return { success: false, error: error.message }
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

    if (error) return { success: false, error: error.message }
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

    if (error) return { success: false, error: error.message }
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

    if (error) return { success: false, error: error.message }
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

    if (error) return { success: false, error: error.message }
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

    if (error) return { success: false, error: error.message }
    return { success: true, data: updated }
}

export async function getPublicInvoice(id: string) {
    const { data: invoice, error } = await supabaseAdmin
        .from('invoices')
        .select(`*, client:leads(*), emitter:emitters(*)`)
        .eq('id', id)
        .single()

    if (error || !invoice) return { error: error?.message || "Invoice not found" }

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
        console.error("[BillingService.getSubscriptionHistory] Error:", error)
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
        console.error("[BillingService.getOrganizationSubscription] Error:", error)
        return null
    }

    return data
}
