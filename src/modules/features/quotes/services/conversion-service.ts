import { createClient as supabaseServer } from "@/modules/core/database/supabase-server"
import { logDomainEvent } from "@/modules/infrastructure/logging/services/event-logger"
import { createInvoiceAction as createInvoice } from "@/modules/features/billing/billing-actions"
import { QuoteItem, InvoiceItem } from "@/types"
import * as BillingUtils from "@/modules/features/billing/services/billing-utils"

/**
 * Service for converting Quotes to other entities (Invoices, Services).
 * Extracted from conversion-actions.ts
 */

export async function convertQuote(quoteId: string) {
    const supabase = await supabaseServer()

    try {
        // 1. Fetch Quote & Items
        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .select('*, client:leads!client_id(*)')
            .eq('id', quoteId)
            .single()

        if (quoteError || !quote) throw new Error("Quote not found")

        // Validation
        if (quote.status === 'converted') {
            throw new Error("Esta cotización ya ha sido procesada anteriormente.")
        }
        if (quote.status !== 'accepted') {
            throw new Error("Solo se pueden convertir cotizaciones aceptadas.")
        }

        const items: QuoteItem[] = quote.items || []

        // 2. Split Items (Buckets)
        const recurringItems = items.filter(i => i.is_recurring)
        const oneOffItems = items.filter(i => !i.is_recurring)

        const results = {
            servicesCreated: 0,
            invoicesCreated: 0,
            unifiedInvoiceId: null as string | null
        }

        let firstCycleId: string | null = null
        let serviceId: string | null = null

        // Bucket A: Recurring Items -> Create Services
        const frequencyGroups = recurringItems.reduce((acc, item) => {
            const freq = item.frequency || 'monthly'
            if (!acc[freq]) acc[freq] = []
            acc[freq].push(item)
            return acc
        }, {} as Record<string, QuoteItem[]>)

        for (const [frequency, groupItems] of Object.entries(frequencyGroups)) {
            const serviceName = groupItems.length === 1
                ? groupItems[0].description
                : `${groupItems[0].description} + ${groupItems.length - 1} servicios`

            const servicePrice = groupItems.reduce((sum, i) => sum + (i.price * i.quantity), 0)

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
                    next_billing_date: BillingUtils.calculateFrequencyNextDate(new Date(), frequency).toISOString(),
                    briefing_template_id: briefingTemplateId,
                    is_catalog_item: false,
                    is_visible_in_portal: true,
                    type: 'recurring',
                    // @ts-ignore
                    emitter_id: quote.emitter_id
                })
                .select()
                .single()

            if (serviceError) throw serviceError

            serviceId = service.id
            results.servicesCreated++

            const cycleStart = new Date()
            const cycleEnd = BillingUtils.calculateFrequencyNextDate(cycleStart, frequency)

            const { data: cycle, error: cycleError } = await supabase
                .from('billing_cycles')
                .insert({
                    service_id: service.id,
                    start_date: cycleStart.toISOString(),
                    end_date: cycleEnd.toISOString(),
                    status: 'pending',
                    amount: servicePrice
                })
                .select()
                .single()

            if (cycleError) throw cycleError
            if (!firstCycleId) firstCycleId = cycle.id
        }

        // UNIFIED INVOICE GENERATION
        const invoiceItems: InvoiceItem[] = []
        let invoiceTotal = 0

        recurringItems.forEach(item => {
            invoiceItems.push({
                description: item.description + ` (Ciclo 1)`,
                quantity: item.quantity,
                price: item.price
            })
            invoiceTotal += (item.price * item.quantity)
        })

        oneOffItems.forEach(item => {
            invoiceItems.push({
                description: item.description,
                quantity: item.quantity,
                price: item.price
            })
            invoiceTotal += (item.price * item.quantity)
        })

        let documentType = 'CUENTA_DE_COBRO'
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
                emitter_id: quote.emitter_id || null,
                date: new Date().toISOString(),
                due_date: new Date().toISOString(),
                items: invoiceItems,
                total: invoiceTotal,
                status: 'pending',
                document_type: documentType,
                service_id: serviceId || undefined,
                cycle_id: firstCycleId || undefined,
                metadata: {
                    source_quote_id: quote.id,
                    type: 'unified_conversion'
                }
            })

            if (invRes.success && invRes.data) {
                results.invoicesCreated++
                results.unifiedInvoiceId = invRes.data.id
            } else {
                throw new Error("Error creando factura unificada: " + invRes.error)
            }
        }

        await supabase
            .from('quotes')
            .update({ status: 'converted' })
            .eq('id', quoteId)

        await logDomainEvent({
            entity_type: 'quote',
            entity_id: quoteId,
            event_type: 'quote.converted',
            payload: { results },
            triggered_by: 'user'
        })

        return { success: true, results }
    } catch (error: any) {
        console.error("[ConversionService.convertQuote] Error:", error)
        return { success: false, error: error.message }
    }
}
