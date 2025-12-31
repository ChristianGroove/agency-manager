'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { Invoice, InvoiceItem } from "@/types"
import { revalidatePath } from "next/cache"

export async function getInvoices() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('invoices')
        .select(`
            *,
            client:clients(name)
        `)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('date', { ascending: false })

    if (error) {
        console.error("Error fetching invoices:", error)
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
            client:clients(*),
            emitter:emitters(*)
        `)
        .eq('id', id)
        .eq('organization_id', orgId)
        .single()

    if (error) {
        console.error("Error fetching invoice:", error)
        return null
    }

    if (!data.emitter) {
        // Smart Fallback: Fetch default emitter
        const { data: defaultEmitter } = await supabase
            .from('emitters')
            .select('*')
            .eq('organization_id', orgId)
            .eq('is_default', true)
            .maybeSingle()

        if (defaultEmitter) {
            data.emitter = defaultEmitter
        } else {
            // Fallback to any active emitter
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

export async function deleteInvoices(ids: string[]) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error("Unauthorized")

    // Verify status before deleting? Assuming allowed for now
    // Soft delete or status update? Usually void/cancel, but let's soft delete for bulk action pattern
    const { error } = await supabase
        .from('invoices')
        .update({
            status: 'void',
            deleted_at: new Date().toISOString()
        })
        .in('id', ids)
        .eq('organization_id', orgId)

    if (error) throw error

    revalidatePath('/invoices')
    return { success: true }
}

export async function createInvoice(data: Partial<Invoice> & { items: InvoiceItem[] }) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error("No organization context")

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("No authenticated user")

    // === PHASE 1: Use Billing Core internally ===

    // 1. Fetch emitter and client for mapping (if provided)
    let issuer = undefined
    let receiver = undefined

    if (data.emitter_id) {
        const { data: emitterData } = await supabase
            .from('emitters')
            .select('*')
            .eq('id', data.emitter_id)
            .single()

        if (emitterData) {
            const { EmitterMapper } = await import('@/modules/billing/legacy/EntityMappers')
            issuer = EmitterMapper.legacyToCore(emitterData)
        }
    }

    if (data.client_id) {
        const { data: clientData } = await supabase
            .from('clients')
            .select('*')
            .eq('id', data.client_id)
            .single()

        if (clientData) {
            const { ClientMapper } = await import('@/modules/billing/legacy/EntityMappers')
            receiver = ClientMapper.legacyToCore(clientData)
        }
    }

    // 2. Convert to Core Document using mapper
    const { InvoiceMapper } = await import('@/modules/billing/legacy/InvoiceMapper')
    const coreDocument = InvoiceMapper.legacyToCore(
        data,
        orgId,
        user.id,
        issuer,
        receiver
    )

    // 3. Process through Core (validates, logs audit)
    const { DocumentService } = await import('@/modules/billing/core/services/DocumentService')
    const { GenericAdapter } = await import('@/modules/billing/adapters/generic/GenericAdapter')

    const adapter = new GenericAdapter()
    const documentService = new DocumentService(adapter)
    const processedDocument = await documentService.createDocument(coreDocument)

    // 4. Convert back to Legacy Invoice - OUTPUT MUST BE IDENTICAL
    const legacyInvoice = InvoiceMapper.coreToLegacy(processedDocument)

    // === End of Core processing ===

    // 5. Save to database (same format as before)
    const { items, ...invoiceData } = data

    const payload = {
        ...invoiceData,
        organization_id: orgId,
        status: legacyInvoice.status || 'pending', // Use Core-derived status
        items: items, // JSONB column
        total: legacyInvoice.total // Use calculated total from Core
    }

    const { data: newInvoice, error } = await supabase
        .from('invoices')
        .insert(payload)
        .select()
        .single()

    if (error) {
        return {
            success: false,
            error: error.message,
            data: null
        }
    }

    revalidatePath('/invoices')
    return {
        success: true,
        data: newInvoice,
        error: null
    } // ✅ Format matches UI expectations
}


import { supabaseAdmin } from "@/lib/supabase-admin"

export async function updateInvoice(id: string, data: Partial<Invoice>) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error("No organization context")

    const { data: updatedInvoice, error } = await supabase
        .from('invoices')
        .update(data)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()

    if (error) throw error

    revalidatePath('/invoices')
    revalidatePath('/invoices')
    return updatedInvoice
}

export async function registerPayment(id: string, amount: number, notes?: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error("Unauthorized")

    // 1. Get current invoice
    const { data: invoice } = await supabase
        .from('invoices')
        .select('*') // Need full object for event logging
        .eq('id', id)
        .single()

    if (!invoice) throw new Error("Invoice not found")

    // 2. Determine new status (Simplified logic for MVP)
    // If amount >= total -> PAID
    // If amount < total -> PARTIALLY_PAID
    const newStatus = amount >= invoice.total ? 'PAID' : 'PARTIALLY_PAID'

    // 3. Create Payment Transaction
    // Reference format: PAY-{Timestamp}-{Random}
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    const reference = `PAY-${timestamp}-${random}`

    // Use supabaseAdmin to bypass RLS for this system record creation
    // The user has permission to pay because they are authed in the org (checked above)
    const { supabaseAdmin } = await import("@/lib/supabase-admin")

    // Prepare payload - handle potential missing metadata column safely?
    // Ideally we should assume schema is correct, but let's be safe for now or at least catch it specifically
    const payload: any = {
        reference,
        amount_in_cents: Math.round(amount * 100),
        currency: invoice.currency || 'COP',
        status: 'APPROVED',
        invoice_ids: [id],
        organization_id: orgId,
        created_at: new Date().toISOString()
    }

    // Try to add metadata if it exists in schema (we can't easily check schema here without query)
    // But since we asked user to migrate, let's include it. If it fails, we catch it.
    payload.metadata = { notes }

    const { error: txError } = await supabaseAdmin
        .from('payment_transactions')
        .insert(payload)

    if (txError) {
        console.error("Error creating payment transaction:", txError)
        // Check if error is related to missing column
        if (txError.message.includes('column "metadata" of relation "payment_transactions" does not exist')) {
            // Fallback: Try insertion WITHOUT metadata
            delete payload.metadata
            const { error: retryError } = await supabaseAdmin
                .from('payment_transactions')
                .insert(payload)

            if (retryError) {
                console.error("Retry failed:", retryError)
                throw new Error("Failed to record payment transaction: " + retryError.message)
            }
        } else {
            throw new Error("Failed to record payment transaction: " + txError.message)
        }
    }

    // 4. Update invoice
    const { error } = await supabase
        .from('invoices')
        .update({
            payment_status: newStatus,
            // In a real system, we would track balance_due
            status: newStatus === 'PAID' ? 'paid' : invoice.status // Sync legacy status column if fully paid
        })
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) throw error

    // 5. Log Domain Event
    try {
        const { logDomainEvent } = await import("@/lib/event-logger")
        await logDomainEvent({
            entity_type: 'invoice',
            entity_id: id,
            event_type: 'invoice.payment_registered',
            payload: {
                invoice_id: id,
                amount_paid: amount,
                new_status: newStatus,
                reference,
                notes
            },
            triggered_by: 'user'
        })
    } catch (e) {
        console.warn("Failed to log domain event", e)
    }

    revalidatePath('/invoices')
    return { success: true }
}

export async function getPublicInvoice(id: string) {
    const { data: invoice, error } = await supabaseAdmin
        .from('invoices')
        .select(`
            *,
            client:clients(*),
            emitter:emitters(*)
        `)
        .eq('id', id)
        .single()

    if (error || !invoice) {
        return { error: error?.message || "Invoice not found" }
    }

    // Smart Fallback for Public View
    if (!invoice.emitter) {
        const { data: defaultEmitter } = await supabaseAdmin
            .from('emitters')
            .select('*')
            .eq('organization_id', invoice.organization_id)
            .eq('is_default', true)
            .maybeSingle()

        if (defaultEmitter) {
            invoice.emitter = defaultEmitter
        } else {
            const { data: anyEmitter } = await supabaseAdmin
                .from('emitters')
                .select('*')
                .eq('organization_id', invoice.organization_id)
                .eq('is_active', true)
                .limit(1)
                .maybeSingle()
            if (anyEmitter) invoice.emitter = anyEmitter
        }
    }

    // Fetch settings for fallback
    const { data: settings } = await supabaseAdmin
        .from('organization_settings')
        .select('*')
        .eq('organization_id', invoice.organization_id)
        .single()

    return { invoice, settings }
}
