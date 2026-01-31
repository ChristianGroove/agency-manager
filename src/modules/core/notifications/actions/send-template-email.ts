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

    // Normalize key
    const normalizedKey = templateKey.trim().toLowerCase()
    console.log(`[SendEmail] Starting. Key: '${normalizedKey}', Client: ${clientId}`)

    // 2. Fetch Context Data (Invoice or Quote)
    let contextData: any = {}

    try {
        if (contextId) {
            console.log(`[SendEmail] Fetching Context ID: ${contextId}`)
            // Try Invoice
            const { data: invoice } = await supabase.from('invoices').select('*').eq('id', contextId).single()
            if (invoice) {
                console.log(`[SendEmail] Found Invoice: ${invoice.number}`)
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
                console.log(`[SendEmail] Invoice not found. Trying Quote...`)
                const { data: quote } = await supabase.from('quotes').select('*').eq('id', contextId).single()
                if (quote) {
                    console.log(`[SendEmail] Found Quote: ${quote.number}`)

                    // Fix: Use 'total' instead of 'price' (which might be null/deprecated)
                    const amount = quote.total || 0

                    // Fix: Robust Link Generation
                    // If client has portal access, send them there. Otherwise, public link.
                    const linkUrl = portalToken
                        ? getPortalUrl(`/portal/${portalToken}/quote/${quote.id}`)
                        : getPortalUrl(`/quote/${quote.id}`)

                    contextData = {
                        ...contextData,
                        number: quote.number,
                        price: amount, // Keep for backward compat if template uses it
                        formatted_amount: `$${amount.toLocaleString()}`,
                        concept: quote.title,
                        link_url: linkUrl,
                        document_type: 'quote'
                    }
                } else {
                    console.warn(`[SendEmail] Context ID ${contextId} not found in Invoices or Quotes.`)
                }
            }
        }
        if ((normalizedKey === 'invoice_summary' || normalizedKey.includes('summary') || normalizedKey.includes('estado')) && clientId) {
            console.log(`[SendEmail] Generating Invoice Summary...`)
            // Special Case: Account Summary
            const { data: pendingInvoices, error: invError } = await supabase
                .from('invoices')
                .select('id, total')
                .eq('client_id', clientId)
                .or('status.eq.pending,status.eq.overdue')

            if (invError) console.error('[SendEmail] Error fetching pending invoices:', invError)

            const count = pendingInvoices?.length || 0
            const total = pendingInvoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0

            console.log(`[SendEmail] Summary Data - Count: ${count}, Total: ${total}`)

            // Safety checks
            const totalStr = !isNaN(total) ? `$${total.toLocaleString()}` : '$0';

            // Ensure token exists or fallback safely
            // If no token, we might point to login or home, but here we try our best.
            const safeToken = portalToken || 'login'
            const linkUrl = getPortalUrl(portalToken ? `/portal/${portalToken}?tab=billing` : `/login?email=${encodeURIComponent(recipient.email)}`)

            contextData = {
                ...contextData,
                total_amount: totalStr,
                count: count,
                link_url: linkUrl,
                document_type: 'summary'
            }
        }
        else if (normalizedKey === 'portal_invite' && clientId) {
            console.log(`[SendEmail] Portal Invite.`)
            const linkUrl = getPortalUrl(portalToken ? `/portal/${portalToken}` : `/login?email=${encodeURIComponent(recipient.email)}`)
            contextData = {
                ...contextData,
                link_url: linkUrl,
                document_type: 'portal_invite'
            }
        }
        else {
            console.log(`[SendEmail] No specific context logic matched. Key: ${normalizedKey}`)
        }
    } catch (err) {
        console.error("[SendEmail] Error loading context data:", err)
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
    console.log('Template Key:', templateKey)
    console.log('Context Data:', JSON.stringify(contextData, null, 2))
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
