'use server'

import { createClient as supabaseServer } from "@/lib/supabase-server"
import { InvoiceItem, InvoiceStatus } from "@/types"
import { logDomainEvent } from "@/lib/event-logger"

export type CreateInvoiceDTO = {
    client_id: string
    emitter_id: string | null
    number: string
    date: string
    due_date: string | null
    items: InvoiceItem[]
    total: number
    status: InvoiceStatus
    document_type: string
    // Linkage
    service_id?: string
    cycle_id?: string
    metadata?: any
}

export async function createInvoice(data: CreateInvoiceDTO) {
    try {
        const supabase = await supabaseServer()

        const invoicePayload = {
            client_id: data.client_id,
            emitter_id: data.emitter_id,
            number: data.number,
            date: data.date,
            due_date: data.due_date,
            items: data.items,
            total: data.total,
            status: data.status,
            document_type: data.document_type,
            service_id: data.service_id || null, // Ensure explicitly null if undefined
            metadata: {
                ...data.metadata,
                generated_via: 'manual_v2',
                cycle_id: data.cycle_id
            }
        }

        // 1. Create Invoice
        const { data: invoice, error } = await supabase
            .from('invoices')
            .insert(invoicePayload)
            .select()
            .single()

        if (error) {
            console.error("Error creating invoice:", error)
            return { success: false, error: error.message }
        }

        // 2. Log Invoice Created Event
        await logDomainEvent({
            entity_type: 'invoice',
            entity_id: invoice.id,
            event_type: 'invoice.created',
            payload: {
                number: invoice.number,
                total: invoice.total,
                client_id: invoice.client_id,
                cycle_id: data.cycle_id
            },
            triggered_by: 'user'
        })

        // 3. Link Billing Cycle (if cycle_id provided)
        if (data.cycle_id) {
            const { error: cycleError } = await supabase
                .from('billing_cycles')
                .update({
                    status: 'invoiced', // TODO: Use canonical Enum if available
                    invoice_id: invoice.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', data.cycle_id)

            if (cycleError) {
                console.error(`Failed to link cycle ${data.cycle_id} to invoice ${invoice.id}:`, cycleError)
                // Don't fail the whole request, but log it.
            } else {
                // Log Cycle Invoiced Event
                await logDomainEvent({
                    entity_type: 'cycle',
                    entity_id: data.cycle_id,
                    event_type: 'cycle.invoiced',
                    payload: { invoice_id: invoice.id },
                    triggered_by: 'system' // Triggered by the system logic in response to user action
                })
            }
        }

        return { success: true, data: invoice }
    } catch (err: any) {
        console.error("Exception in createInvoice:", err)
        return { success: false, error: err.message || "Unknown server error" }
    }
}
