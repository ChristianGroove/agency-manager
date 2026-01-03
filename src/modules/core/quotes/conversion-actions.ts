"use server"

import { createClient as supabaseServer } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { logDomainEvent } from "@/lib/event-logger"
import { createInvoice } from "@/modules/core/billing/invoices-actions"
import { Quote, QuoteItem, InvoiceItem } from "@/types"

export async function convertQuote(quoteId: string) {
    const supabase = await supabaseServer()

    try {
        // 1. Fetch Quote & Items
        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .select('*, client:clients(*)')
            .eq('id', quoteId)
            .single()

        if (quoteError || !quote) throw new Error("Quote not found")

        // --- IDEMPOTENCY & VALIDATION ---
        if (quote.status === 'converted') {
            throw new Error("Esta cotización ya ha sido procesada anteriormente.")
        }
        if (quote.status !== 'accepted') {
            throw new Error("Solo se pueden convertir cotizaciones aceptadas.")
        }
        // -------------------------------

        const items: QuoteItem[] = quote.items || []

        // 2. Split Items (Buckets)
        const recurringItems = items.filter(i => i.is_recurring) // Bucket A
        const oneOffItems = items.filter(i => !i.is_recurring)   // Bucket B

        const results = {
            servicesCreated: 0,
            invoicesCreated: 0,
            unifiedInvoiceId: null as string | null
        }

        let firstCycleId: string | null = null
        let serviceId: string | null = null

        // ==========================================
        // Bucket A: Recurring Items -> Create Services (But SKIP invoice generation here)
        // ==========================================

        // We assume typically one main recurring service (or grouped by frequency). 
        // If multiple frequencies exist, we might have multiple services. 
        // For the UNIFIED invoice, we typically only include the cycle of the PRIMARY service (or all?).
        // Complex case: Monthly plan + Setup. 
        // Let's iterate frequency groups, but we need to collect ALL items for the single invoice.

        const frequencyGroups = recurringItems.reduce((acc, item) => {
            const freq = item.frequency || 'monthly'
            if (!acc[freq]) acc[freq] = []
            acc[freq].push(item)
            return acc
        }, {} as Record<string, QuoteItem[]>)

        // Iterate groups to create services
        for (const [frequency, groupItems] of Object.entries(frequencyGroups)) {

            const serviceName = groupItems.length === 1
                ? groupItems[0].description
                : `${groupItems[0].description} + ${groupItems.length - 1} servicios`

            const servicePrice = groupItems.reduce((sum, i) => sum + (i.price * i.quantity), 0)

            // Resolve Briefing Inheritance
            let briefingTemplateId = null
            const primaryCatalogId = groupItems.find(i => i.catalog_item_id)?.catalog_item_id

            if (primaryCatalogId) {
                const { data: catalogItem } = await supabase
                    .from('services')
                    .select('briefing_template_id')
                    .eq('id', primaryCatalogId)
                    .single()

                if (catalogItem) {
                    briefingTemplateId = catalogItem.briefing_template_id
                }
            }

            // Create Service
            const { data: service, error: serviceError } = await supabase
                .from('services')
                .insert({
                    client_id: quote.client_id,
                    name: serviceName,
                    status: 'active',
                    frequency: frequency,
                    base_price: servicePrice,
                    amount: servicePrice,
                    start_date: new Date().toISOString(),
                    billing_cycle_start_date: new Date().toISOString(),
                    next_billing_date: calculateEndDate(new Date(), frequency),
                    briefing_template_id: briefingTemplateId,
                    is_catalog_item: false,
                    is_visible_in_portal: true,
                    type: 'recurring',
                    // @ts-ignore
                    emitter_id: quote.emitter_id // Link Service to Emitter
                })
                .select()
                .single()

            if (serviceError) throw serviceError

            serviceId = service.id // Keep reference (last one wins if multiple, but verified logic supports this?)
            results.servicesCreated++

            // Create First Billing Cycle
            const cycleStart = new Date()
            const cycleEnd = calculateEndDate(cycleStart, frequency)

            const { data: cycle, error: cycleError } = await supabase
                .from('billing_cycles')
                .insert({
                    service_id: service.id,
                    start_date: cycleStart.toISOString(),
                    end_date: cycleEnd,
                    status: 'pending', // Will be invoiced below
                    amount: servicePrice
                })
                .select()
                .single()

            if (cycleError) throw cycleError

            if (!firstCycleId) firstCycleId = cycle.id // Capture the first cycle ID for linking
        }

        // ==========================================
        // UNIFIED INVOICE GENERATION
        // ==========================================
        // Goal: Link One-Offs + Recurring First Cycle items into ONE invoice.

        const invoiceItems: InvoiceItem[] = []
        let invoiceTotal = 0

        // 1. Add Recurring Items (from the cycle we just created)
        // If we created multiple services, we add all their items. 
        // Ideally, we iterate again or just map from the buckets.
        recurringItems.forEach(item => {
            invoiceItems.push({
                description: item.description + ` (Ciclo 1)`, // Contextualize?
                quantity: item.quantity,
                price: item.price
            })
            invoiceTotal += (item.price * item.quantity)
        })

        // 2. Add One-Off Items (Setup, etc)
        oneOffItems.forEach(item => {
            invoiceItems.push({
                description: item.description,
                quantity: item.quantity,
                price: item.price
            })
            invoiceTotal += (item.price * item.quantity)
        })

        // Fetch Emitter to determine Document Type
        let documentType = 'CUENTA_DE_COBRO' // Default fallback
        if (quote.emitter_id) {
            const { data: emitter } = await supabase
                .from('emitters')
                .select('allowed_document_types')
                .eq('id', quote.emitter_id)
                .single()

            if (emitter && emitter.allowed_document_types?.length > 0) {
                documentType = emitter.allowed_document_types[0]
            }
        }

        if (invoiceItems.length > 0) {
            const invRes = await createInvoice({
                client_id: quote.client_id,
                emitter_id: quote.emitter_id || null, // VITAL: Use the emitter from quote
                number: `INV-Uni-${Date.now()}`, // Temporary numbering
                date: new Date().toISOString(),
                due_date: new Date().toISOString(),
                items: invoiceItems,
                total: invoiceTotal,
                status: 'pending',
                document_type: documentType,
                service_id: serviceId || undefined, // Link to main service if exists
                cycle_id: firstCycleId || undefined, // Link to main cycle if exists
                metadata: {
                    source_quote_id: quote.id,
                    type: 'unified_conversion'
                }
            })

            if (invRes.success && invRes.data) {
                results.invoicesCreated++
                results.unifiedInvoiceId = invRes.data.id
            } else {
                console.error("Failed to create unified invoice:", invRes.error)
                // We should probably throw here to alert the user, or at least return partial success?
                // For now, let's treat it as a hard failure effectively, or just log. 
                // Given the user complaint, let's throw to ensure they see something went wrong.
                throw new Error("Error creando factura unificada: " + invRes.error)
            }
        }

        // 3. Update Quote Status
        await supabase
            .from('quotes')
            .update({ status: 'converted' })
            .eq('id', quoteId)

        // 4. Log Event
        await logDomainEvent({
            entity_type: 'quote',
            entity_id: quoteId,
            event_type: 'quote.converted',
            payload: { results },
            triggered_by: 'user'
        })

        revalidatePath(`/quotes/${quoteId}`)
        revalidatePath('/services')
        revalidatePath('/invoices')

        return { success: true, results }

    } catch (error: any) {
        console.error("Convert Quote Error:", error)
        return { success: false, error: error.message }
    }
}

function calculateEndDate(date: Date, frequency: string): string {
    const d = new Date(date)
    if (frequency === 'monthly') d.setMonth(d.getMonth() + 1)
    else if (frequency === 'biweekly') d.setDate(d.getDate() + 15)
    else if (frequency === 'quarterly') d.setMonth(d.getMonth() + 3)
    else if (frequency === 'semiannual') d.setMonth(d.getMonth() + 6)
    else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + 1)
    else d.setMonth(d.getMonth() + 1) // Default
    return d.toISOString()
}
