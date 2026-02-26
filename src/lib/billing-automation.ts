import { supabaseAdmin as supabase } from "@/lib/supabase-admin" // Alias as supabase to keep code compatible
import * as BillingUtils from "@/lib/billing-utils"
import { logDomainEvent } from "@/lib/event-logger"

/**
 * STEP 0 — Self-Healing
 * Scans all active recurring services that have an overdue `next_billing_date`
 * and NO pending billing_cycle. Creates the missing cycle so the main loop
 * can process it and generate the invoice with the correct retroactive date.
 *
 * This guarantees continuity: the billing day (e.g. 19th, 26th) is always
 * preserved because `next_billing_date` IS the correct end_date for the cycle.
 */
async function repairOrphanedCycles(): Promise<number> {
    const now = new Date()

    // Find recurring active services where next_billing_date has already passed
    const { data: services, error } = await supabase
        .from('services')
        .select('id, name, frequency, amount, next_billing_date, organization_id')
        .eq('type', 'recurring')
        .eq('status', 'active')
        .is('deleted_at', null)
        .not('next_billing_date', 'is', null)
        .lte('next_billing_date', now.toISOString())

    if (error || !services || services.length === 0) return 0

    let repairedCount = 0

    for (const svc of services) {
        // Skip services that already have a pending cycle
        const { data: existingPending } = await supabase
            .from('billing_cycles')
            .select('id')
            .eq('service_id', svc.id)
            .eq('status', 'pending')
            .maybeSingle()

        if (existingPending) continue

        // Use next_billing_date as the cycle's end_date — this preserves the billing day
        const cycleEnd = new Date(svc.next_billing_date)

        // Determine cycle start from the last existing cycle, or derive from frequency
        const { data: lastCycle } = await supabase
            .from('billing_cycles')
            .select('end_date')
            .eq('service_id', svc.id)
            .order('end_date', { ascending: false })
            .limit(1)
            .maybeSingle()

        let cycleStart: Date
        if (lastCycle) {
            cycleStart = new Date(lastCycle.end_date)
        } else {
            cycleStart = new Date(cycleEnd)
            switch (svc.frequency) {
                case 'biweekly': cycleStart.setDate(cycleStart.getDate() - 14); break
                case 'quarterly': cycleStart.setMonth(cycleStart.getMonth() - 3); break
                case 'semiannual': cycleStart.setMonth(cycleStart.getMonth() - 6); break
                case 'yearly': cycleStart.setFullYear(cycleStart.getFullYear() - 1); break
                default: cycleStart.setMonth(cycleStart.getMonth() - 1)
            }
        }

        const dueDate = new Date(cycleEnd)
        dueDate.setDate(dueDate.getDate() + 5)

        const { error: insertError } = await supabase
            .from('billing_cycles')
            .insert({
                service_id: svc.id,
                start_date: cycleStart.toISOString(),
                end_date: cycleEnd.toISOString(),
                due_date: dueDate.toISOString(),
                amount: svc.amount,
                status: 'pending'
            })

        if (!insertError) {
            console.log(`[SelfHeal] Repaired missing cycle for service "${svc.name}" (${svc.id}), end=${cycleEnd.toISOString().substring(0, 10)}`)
            repairedCount++
        } else {
            console.error(`[SelfHeal] Failed to repair cycle for service ${svc.id}:`, insertError)
        }
    }

    return repairedCount
}

/**
 * Checks for pending billing cycles that are due (end_date <= now)
 * and generates invoices for them.
 * 
 * Also creates the NEXT billing cycle for recurring services.
 */
export async function checkAndGenerateCycles() {
    try {
        const now = new Date()

        // STEP 0: Self-healing — create missing pending cycles before processing
        const repairedCount = await repairOrphanedCycles()
        if (repairedCount > 0) {
            console.log(`[BillingAuto] Self-healed ${repairedCount} service(s) with missing pending cycles.`)
        }

        // 1. Fetch pending cycles that have ended
        const { data: cycles, error } = await supabase
            .from('billing_cycles')
            .select(`
                *,
                service:services!inner (
                    id,
                    name,
                    client_id,
                    amount,
                    frequency,
                    type,
                    emitter_id,
                document_type,
                    quantity,
                    organization_id,
                    deleted_at,
                    metadata
                )
            `)
            .eq('status', 'pending')
            .is('service.deleted_at', null)
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
            const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`
            const cycleEndDate = new Date(cycle.end_date)
            // Use the cycle's end_date as invoice date for retroactive billing.
            // This preserves the original billing day (e.g. 19th, 26th) even when
            // the automator runs late or self-heals overdue cycles.
            const issueDate = cycleEndDate < now ? cycleEndDate : now

            // Check for Late Issuance (Retroactive)
            // Rule: If cycle ended more than 4 days ago, mark as late.
            // Compare cycleEndDate vs now (not issueDate) because issueDate IS cycleEndDate for retroactive cycles.
            const diffTime = Math.abs(now.getTime() - cycleEndDate.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            const isLateIssued = diffDays > 4

            // Due date: issue date + 30 days (per prompt requirement)
            const dueDate = new Date(issueDate)
            dueDate.setDate(dueDate.getDate() + 30)

            // Invoice Metadata
            const invoiceMetadata = {
                ...(typeof service.metadata === 'object' ? service.metadata : {}),
                generated_via: 'automation_v2',
                cycle_id: cycle.id,
                cycle_period: { start: cycle.start_date, end: cycle.end_date }
            }

            // Create Invoice
            const { data: invoice, error: invError } = await supabase
                .from('invoices')
                .insert({
                    organization_id: service.organization_id, // CRITICAL FIX
                    client_id: service.client_id,
                    service_id: service.id,
                    emitter_id: service.emitter_id,
                    document_type: service.document_type || BillingUtils.getEmitterDocumentType('JURIDICO'),
                    number: invoiceNumber,
                    date: issueDate.toISOString(),
                    due_date: dueDate.toISOString(),
                    status: 'pending',
                    total: cycle.amount,
                    is_late_issued: isLateIssued,
                    metadata: invoiceMetadata,
                    items: [{
                        description: `${service.name} (${formatDate(cycle.start_date)} - ${formatDate(cycle.end_date)})`,
                        quantity: service.quantity || 1,
                        price: (cycle.amount / (service.quantity || 1))
                    }],
                    billing_cycle_id: cycle.id // NEW: Populating proper FK
                })
                .select()
                .single()

            if (invError) {
                console.error(`Failed to create invoice for cycle ${cycle.id}:`, invError)
                continue
            }

            // Log Invoice Creation
            await logDomainEvent({
                entity_type: 'invoice',
                entity_id: invoice.id,
                event_type: 'invoice.created',
                payload: {
                    number: invoice.number,
                    amount: invoice.total,
                    is_late_issued: isLateIssued,
                    cycle_id: cycle.id
                },
                triggered_by: 'system'
            })

            // B. Update Cycle (Mark as Invoiced)
            await supabase
                .from('billing_cycles')
                .update({
                    status: 'invoiced',
                    invoice_id: invoice.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', cycle.id)

            // Log Cycle Invoiced
            await logDomainEvent({
                entity_type: 'cycle',
                entity_id: cycle.id,
                event_type: 'cycle.invoiced',
                payload: {
                    invoice_id: invoice.id
                },
                triggered_by: 'system'
            })

            // C. Create NEXT Billing Cycle (if recurring)
            if (service.type === 'recurring' && service.frequency) {
                const nextStart = new Date(cycle.end_date)
                const nextEnd = calculateNextEndDate(nextStart, service.frequency)

                // Keep next_due logic consistent or update? Keeping as is for now.
                const nextDue = new Date(nextEnd)
                nextDue.setDate(nextDue.getDate() + 5)

                const { data: nextCycleData, error: nextCycleError } = await supabase.from('billing_cycles').insert({
                    service_id: service.id,
                    start_date: nextStart.toISOString(),
                    end_date: nextEnd.toISOString(),
                    due_date: nextDue.toISOString(),
                    amount: service.amount,
                    status: 'pending'
                }).select().single()

                if (nextCycleError) {
                    console.error("Failed to create NEXT cycle:", nextCycleError)
                    throw new Error(`Error creando siguiente ciclo: ${nextCycleError.message}`)
                }

                // Log Next Cycle
                await logDomainEvent({
                    entity_type: 'cycle',
                    entity_id: (nextCycleData as any)?.id || 'unknown',
                    event_type: 'cycle.created',
                    payload: {
                        start_date: nextStart,
                        end_date: nextEnd,
                        service_id: service.id
                    },
                    triggered_by: 'system'
                })

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
