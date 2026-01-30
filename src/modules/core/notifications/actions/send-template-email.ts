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
        .select('name, email, phone, portal_short_token, portal_token')
        .eq('id', clientId)
        .single()

    // Also try fetch lead if client not found? (For CRM)
    let recipient: any = client
    let portalToken = client?.portal_short_token || client?.portal_token

    if (!recipient) {
        const { data: lead } = await supabase.from('leads').select('name, email, phone').eq('id', clientId).single()
        recipient = lead
        // Leads might not have portal access yet? 
        // If it's a lead, we might not have a token. 
        // But send-template-email is mostly for CLIENTS.
    }

    if (!recipient || !recipient.email) {
        return { success: false, error: "Client not found or missing email" }
    }

    // Ensure we have a token if we are sending portal links
    if (!portalToken && templateKey !== 'briefing_submission') {
        // Try to use ID as fallback only if likely to fail later? 
        // Better to warn. For now let's not block, but link will 404/401.
        console.warn("Client has no portal token", clientId)
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
                link_url: getPortalUrl(`/portal/${portalToken}/invoice/${invoice.id}`),
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
                    link_url: getPortalUrl(`/portal/${portalToken}/quote/${quote.id}`),
                    document_type: 'quote'
                }
            }
        }
    } else if (templateKey === 'invoice_summary' && clientId) {
        // Special Case: Account Summary
        const { data: pendingInvoices } = await supabase
            .from('invoices')
            .select('id, total')
            .eq('client_id', clientId)
            .or('status.eq.pending,status.eq.overdue')

        const count = pendingInvoices?.length || 0
        const total = pendingInvoices?.reduce((sum, inv) => sum + inv.total, 0) || 0

        contextData = {
            ...contextData,
            total_amount: `$${total.toLocaleString()}`,
            count: count,
            link_url: getPortalUrl(`/portal/${portalToken}/billing`),
            document_type: 'summary'
        }
    } else if (templateKey === 'portal_invite' && clientId) {
        contextData = {
            ...contextData,
            link_url: getPortalUrl(`/portal/${portalToken}`),
            document_type: 'portal_invite'
        }
    }

    // 3. Prepare Template Variables
    const brandingConfig = await getEffectiveBranding(orgId)

    // Resolve optimal logo for email (Light background)
    let logoToUse = brandingConfig.logos.main_light || brandingConfig.logos.main || ""

    // Ensure absolute URL
    if (logoToUse && logoToUse.startsWith('/')) {
        logoToUse = getPortalUrl(logoToUse)
    }

    console.log('--- DEBUG EMAIL LOGO ---')
    console.log('Original Main:', brandingConfig.logos.main)
    console.log('Original Light:', brandingConfig.logos.main_light)
    console.log('Resolved Logo:', logoToUse)
    console.log('------------------------')

    const templateVars = {
        agency_name: brandingConfig.name,
        primary_color: brandingConfig.colors.primary,
        secondary_color: brandingConfig.colors.secondary,
        logo_url: logoToUse,
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
