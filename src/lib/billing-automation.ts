import { supabase } from "@/lib/supabase"
import * as BillingUtils from "@/lib/billing-utils"

/**
 * Checks for pending billing cycles that are due (end_date <= now)
 * and generates invoices for them.
 * 
 * Also creates the NEXT billing cycle for recurring services.
 */
export async function checkAndGenerateCycles() {
    try {
        const now = new Date()

        // 1. Fetch pending cycles that have ended
        const { data: cycles, error } = await supabase
            .from('billing_cycles')
            .select(`
                *,
                service:services (
                    id,
                    name,
                    client_id,
                    amount,
                    frequency,
                    type,
                    emitter_id,
                    document_type,
                    quantity
                )
            `)
            .eq('status', 'pending')
            .lte('end_date', now.toISOString())

        if (error) {
            console.error("Error fetching pending cycles:", error)
            return { success: false, error }
        }

        if (!cycles || cycles.length === 0) {
            return { success: true, count: 0 }
        }

        let processedCount = 0

        // 2. Process each cycle
        for (const cycle of cycles) {
            const service = cycle.service

            if (!service) {
                console.warn(`Cycle ${cycle.id} has no service attached. Skipping.`)
                continue
            }

            // A. Generate Invoice for this cycle
            // Use existing utils or inline logic?
            // We need to generate an invoice.

            const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`
            const issueDate = new Date()

            // Due date: issue date + X days (e.g. 5 days default for recurring)
            // Or should we use cycle.due_date? Cycle due date was estimated. 
            // Better to recalculate from "Now" (Issue Date) or respect the original cycle plan?
            // "Vencimiento: issue_date + 30 días (mantener lógica actual)" from prompt.
            // Prompt says "Vencimiento: issue_date + 30 días"

            const dueDate = new Date(issueDate)
            dueDate.setDate(dueDate.getDate() + 30) // Per prompt requirement

            // Create Invoice
            const { data: invoice, error: invError } = await supabase
                .from('invoices')
                .insert({
                    client_id: service.client_id,
                    service_id: service.id,
                    emitter_id: service.emitter_id,
                    document_type: service.document_type || BillingUtils.getEmitterDocumentType('JURIDICO'), // Fallback? 
                    number: invoiceNumber,
                    date: issueDate.toISOString(),
                    due_date: dueDate.toISOString(),
                    status: 'pending', // Pending payment
                    total: cycle.amount,
                    items: [{
                        description: `${service.name} (${formatDate(cycle.start_date)} - ${formatDate(cycle.end_date)})`,
                        quantity: service.quantity || 1,
                        price: (cycle.amount / (service.quantity || 1))
                    }]
                })
                .select()
                .single()

            if (invError) {
                console.error(`Failed to create invoice for cycle ${cycle.id}:`, invError)
                continue
            }

            // B. Update Cycle (Mark as Invoiced)
            await supabase
                .from('billing_cycles')
                .update({
                    status: 'invoiced',
                    invoice_id: invoice.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', cycle.id)

            // C. Create NEXT Billing Cycle (if recurring)
            if (service.type === 'recurring' && service.frequency) {
                const nextStart = new Date(cycle.end_date)
                const nextEnd = calculateNextEndDate(nextStart, service.frequency)

                // Estimate next due date?
                // For the cycle record, due_date is informational until invoiced.
                const nextDue = new Date(nextEnd)
                nextDue.setDate(nextDue.getDate() + 5)

                const { error: nextCycleError } = await supabase.from('billing_cycles').insert({
                    service_id: service.id,
                    start_date: nextStart.toISOString(),
                    end_date: nextEnd.toISOString(),
                    due_date: nextDue.toISOString(),
                    amount: service.amount, // Assume same amount
                    status: 'pending'
                })

                if (nextCycleError) {
                    console.error("Failed to create NEXT cycle:", nextCycleError)
                    // If we fail to create the next cycle, we should probably throw or return a partial error?
                    // For now, let's log it so the toast picks it up if we bubble it?
                    // Actually, we are inside a loop. We should track errors.
                    throw new Error(`Error creando siguiente ciclo: ${nextCycleError.message}`)
                }

                // Update Service next_billing_date
                await supabase.from('services').update({
                    next_billing_date: nextEnd.toISOString()
                }).eq('id', service.id)
            }

            processedCount++
        }

        return { success: true, count: processedCount }

    } catch (err) {
        console.error("Unexpected error in billing automation:", err)
        return { success: false, error: err }
    }
}

function calculateNextEndDate(startDate: Date, frequency: string): Date {
    const end = new Date(startDate)
    switch (frequency) {
        case 'biweekly': end.setDate(end.getDate() + 14); break; // Or use strict months? User prompts suggests precise dates.
        case 'quarterly': end.setMonth(end.getMonth() + 3); break;
        case 'semiannual': end.setMonth(end.getMonth() + 6); break;
        case 'yearly': end.setFullYear(end.getFullYear() + 1); break;
        case 'monthly':
        default:
            end.setMonth(end.getMonth() + 1);
            break;
    }
    return end
}

function formatDate(dateStr: string) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}
