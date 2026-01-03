'use server'

import { createClient } from "@/lib/supabase-server"
import { EmailService } from "@/modules/core/notifications/email.service"
import { getInvoiceEmailHtml } from "@/lib/email-templates"
import { getEffectiveBranding } from "@/modules/core/branding/actions"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

export async function sendInvoiceEmail(invoiceId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error("Unauthorized")

    // 1. Fetch Invoice & Client
    const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
            *,
            client:clients (
                name,
                email
            ),
            organization:organizations (
                name
            )
        `)
        .eq('id', invoiceId)
        .eq('organization_id', orgId)
        .single()

    if (invoiceError || !invoice) {
        console.error("Error fetching invoice:", invoiceError)
        return { success: false, error: "Invoice not found" }
    }

    if (!invoice.client?.email) {
        return { success: false, error: "Client has no email address" }
    }

    // 3. Map to EmailBranding Template Interface
    const brandingConfig = await getEffectiveBranding(orgId)
    const emailBranding = {
        agency_name: brandingConfig.name,
        primary_color: brandingConfig.colors.primary,
        secondary_color: brandingConfig.colors.secondary,
        logo_url: brandingConfig.logos.main || undefined,
        website_url: brandingConfig.website,
        footer_text: `© ${new Date().getFullYear()} ${brandingConfig.name}. Todos los derechos reservados.`
    }

    // 4. Generate HTML
    const emailHtml = getInvoiceEmailHtml(
        invoice.client.name,
        invoice.number,
        `$${invoice.total.toLocaleString()}`,
        new Date(invoice.due_date || invoice.date).toLocaleDateString(),
        "Servicios Profesionales",
        emailBranding
    )

    // 5. Send Email
    const result = await EmailService.send({
        to: invoice.client.email,
        subject: `Nuevo Documento de Cobro #${invoice.number} - ${brandingConfig.name}`,
        html: emailHtml,
        organizationId: orgId,
        tags: [
            { name: 'invoice_id', value: invoice.id },
            { name: 'document_type', value: 'invoice' }
        ]
    })

    if (!result.success) {
        return { success: false, error: "Failed to send email via provider" }
    }

    // 5. Audit / Log (Optional - AuditLog handles this?)
    // Ideally we log this action in the Billing Audit Log too
    // For now we rely on EmailService logging to `email_logs` table

    return { success: true }
}
