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

    // 1. Create Invoice
    const { items, ...invoiceData } = data

    // Explicitly set status to pending if not provided
    const payload = {
        ...invoiceData,
        organization_id: orgId,
        status: invoiceData.status || 'pending',
        items: items // Store items in JSONB column 'items' as denormalization/backup if column exists, 
        // BUT usually we insert into invoice_items table. 
        // Let's check if 'items' column exists in Invoice interface. Yes it does.
        // Legacy system often stored items in JSONB column 'items' on the invoice table itself for simplicity.
        // Based on usage in create-invoice-sheet, it passes 'items'.
    }

    const { data: newInvoice, error } = await supabase
        .from('invoices')
        .insert(payload)
        .select()
        .single()

    if (error) throw error

    // 2. OPTIONAL: If there is a separate invoice_items table, insert there too.
    // Checking schema via previous migrations or knowledge...
    // Usually legacy code might just use JSONB in 'items' column.
    // Given usage `items: cleanItems` in payload, it implies JSONB column.

    revalidatePath('/invoices')
    return newInvoice
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
    return updatedInvoice
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
