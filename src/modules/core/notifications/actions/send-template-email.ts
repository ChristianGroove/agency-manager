'use server'

import { createClient } from "@/lib/supabase-server"
import { EmailService } from "@/modules/core/notifications/email.service"
import { TemplateEngine } from "@/modules/core/notifications/template-engine"
import { getEffectiveBranding } from "@/modules/core/branding/actions"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { getPortalUrl } from "@/lib/utils"

interface SendTemplateEmailPayload {
    clientId: string
    templateKey: string // 'invoice_new', 'quote_new', 'payment_reminder'
    contextId?: string // invoice_id or quote_id
    customSubject?: string
}

export async function sendTemplateEmail({ clientId, templateKey, contextId, customSubject }: SendTemplateEmailPayload) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    // 1. Fetch Client
    const { data: client } = await supabase
        .from('clients')
        .select('name, email, phone')
        .eq('id', clientId)
        .single()

    // Also try fetch lead if client not found? (For CRM)
    let recipient = client
    if (!recipient) {
        const { data: lead } = await supabase.from('leads').select('name, email, phone').eq('id', clientId).single()
        recipient = lead
    }

    if (!recipient || !recipient.email) {
        return { success: false, error: "Client not found or missing email" }
    }

    // 2. Fetch Context Data (Invoice or Quote)
    let contextData: any = {}

    if (contextId) {
        // Try Invoice
        const { data: invoice } = await supabase.from('invoices').select('*').eq('id', contextId).single()
        if (invoice) {
            contextData = {
                ...contextData,
                invoice_number: invoice.number,
                formatted_amount: `$${invoice.total.toLocaleString()}`,
                due_date: new Date(invoice.due_date || invoice.date).toLocaleDateString(),
                date: new Date(invoice.date).toLocaleDateString(),
                concept: invoice.description || "Servicios Profesionales",
                link_url: getPortalUrl(`/portal/${orgId}/invoice/${invoice.id}`),
                document_type: 'invoice'
            }
        } else {
            // Try Quote
            const { data: quote } = await supabase.from('quotes').select('*').eq('id', contextId).single()
            if (quote) {
                contextData = {
                    ...contextData,
                    price: quote.price, // Adapt based on actual quote schema
                    formatted_amount: `$${(quote.price || 0).toLocaleString()}`,
                    concept: quote.title,
                    link_url: getPortalUrl(`/portal/${orgId}/quote/${quote.id}`),
                    document_type: 'quote'
                }
            }
        }
    }

    // 3. Prepare Template Variables
    const brandingConfig = await getEffectiveBranding(orgId)

    const templateVars = {
        agency_name: brandingConfig.name,
        primary_color: brandingConfig.colors.primary,
        secondary_color: brandingConfig.colors.secondary,
        logo_url: brandingConfig.logos.main || "",
        website_url: brandingConfig.website || "#",
        client_name: recipient.name,
        year: new Date().getFullYear(),
        ...contextData
    }

    // 4. Render
    const { html: emailHtml, subject: renderedSubject } = await TemplateEngine.render(
        orgId,
        templateKey,
        templateVars
    )

    // 5. Send
    const result = await EmailService.send({
        to: recipient.email,
        subject: customSubject || renderedSubject,
        html: emailHtml,
        organizationId: orgId,
        tags: [
            { name: 'document_type', value: contextData.document_type || 'general' },
            { name: 'client_id', value: clientId }
        ]
    })

    return result
}
