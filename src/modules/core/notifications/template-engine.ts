import { createClient } from "@/lib/supabase-server"
import { EmailBranding, getInvoiceEmailHtml, getQuoteEmailHtml, getBriefingSubmissionEmailHtml, getInvoiceSummaryEmailHtml, getPortalInviteEmailHtml } from "@/lib/email-templates"

export class TemplateEngine {

    /**
     * Renders a standardized email template using data from the DB or a fallback.
     */
    static async render(organizationId: string, templateKey: string, variables: Record<string, any>) {
        const supabase = await createClient()

        // 1. Fetch Active Template for Org
        const { data: template } = await supabase
            .from("email_templates")
            .select("*")
            .eq("organization_id", organizationId)
            .eq("template_key", templateKey)
            .eq("is_active", true)
            .single()

        let html = ""
        let subject = ""
        let style: any = 'minimal' // Default style

        if (template) {
            html = template.body_html || ""
            subject = template.subject_template
            if (template.variant_name) style = template.variant_name
        } else {
            // 2. Fallback to System Default (Minimal or any system default found)
            const { data: systemTemplate } = await supabase
                .from("email_templates")
                .select("*")
                .is("organization_id", null)
                .eq("template_key", templateKey)
                // We don't force 'minimal' here anymore, we try to find ANY system default if specific one fails,
                // BUT actually, if we want to support style selection, we need to know WHICH style the user wants.
                // The current signature render(orgId, templateKey) doesn't allow passing a style preference unless it's in the DB as active.
                // So we rely on the DB having an 'active' template with the desired variant.
                // If the user selected 'Neo' in settings -> it's active -> we get it here.
                // If it has empty body -> we use the style.
                .eq("is_active", true)
                .single()

            if (systemTemplate) {
                html = systemTemplate.body_html || ""
                subject = systemTemplate.subject_template
                if (systemTemplate.variant_name) style = systemTemplate.variant_name
            }
        }

        // HYBRID_LOGIC: If HTML is empty but we have a style/variant, generate it via code.
        const isHtmlEmpty = !html || html.trim() === "" || html === "<!-- HTML rendered by code fallback -->"

        if (isHtmlEmpty) {
            // 3. Generate from Code using the detected Style
            const branding: EmailBranding = {
                agency_name: variables.agency_name || "Agencia",
                primary_color: variables.primary_color || "#4F46E5",
                secondary_color: variables.secondary_color || "#EC4899",
                logo_url: variables.logo_url,
                website_url: variables.website_url,
                footer_text: `© ${new Date().getFullYear()} ${variables.agency_name || 'Agencia'}.`
            }

            switch (templateKey) {
                case 'invoice_new':
                    html = getInvoiceEmailHtml(
                        variables.client_name,
                        variables.invoice_number || '000',
                        variables.formatted_amount,
                        variables.due_date,
                        variables.concept,
                        branding,
                        style // Pass the style from DB
                    )
                    if (!subject) subject = `Nueva Factura de ${branding.agency_name}`
                    break;
                case 'quote_new':
                    html = getQuoteEmailHtml(
                        variables.client_name,
                        variables.number || '000',
                        variables.formatted_amount,
                        new Date().toLocaleDateString(),
                        variables.link_url || '#',
                        branding,
                        style
                    )
                    if (!subject) subject = `Nueva Cotización de ${branding.agency_name}`
                    break;
                case 'invoice_summary':
                    html = getInvoiceSummaryEmailHtml(
                        variables.client_name,
                        variables.total_amount,
                        variables.count,
                        variables.link_url,
                        branding,
                        style
                    )
                    if (!subject) subject = `Estado de Cuenta - ${branding.agency_name}`
                    break;
                case 'briefing_completed':
                    html = getBriefingSubmissionEmailHtml(
                        variables.client_name,
                        variables.template_name,
                        variables.link_url,
                        branding,
                        style
                    )
                    if (!subject) subject = `Nuevo Briefing: ${variables.template_name}`
                    break;
                case 'portal_invite':
                    html = getPortalInviteEmailHtml(
                        variables.client_name,
                        variables.link_url,
                        branding,
                        style
                    )
                    if (!subject) subject = `Bienvenido al Portal de ${branding.agency_name}`
                    break;
                default:
                    // If absolutely nothing found and no code generator
                    if (!html) {
                        console.error(`[TemplateEngine] Critical: No template found for ${templateKey}`)
                        return { html: "<p>Error rendering email. Template not found.</p>", subject: "Notification" }
                    }
            }
        }


        // 3. Process Variables (Simple Mustache-style replacement)
        // Common Branding Variables (if not passed)
        if (!variables.agency_name || !variables.logo_url) {
            // We assume caller passes them, but we could fetch branding here if needed.
        }

        let renderedHtml = html
        let renderedSubject = subject

        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, "g")
            const valStr = value === undefined || value === null ? "" : String(value)
            renderedHtml = renderedHtml.replace(regex, valStr)
            renderedSubject = renderedSubject.replace(regex, valStr)
        })

        // 4. Handle Conditionals (Specific optimize for logo_url and general simple booleans)
        const processConditional = (key: string, val: any) => {
            const isTruthy = !!val && val !== "";
            const ifElseRegex = new RegExp(`{{#if ${key}}}([\\s\\S]*?){{else}}([\\s\\S]*?){{\\/if}}`, "g");
            const ifRegex = new RegExp(`{{#if ${key}}}([\\s\\S]*?){{\\/if}}`, "g");

            if (isTruthy) {
                renderedHtml = renderedHtml.replace(ifElseRegex, "$1");
                renderedHtml = renderedHtml.replace(ifRegex, "$1");
            } else {
                renderedHtml = renderedHtml.replace(ifElseRegex, "$2");
                renderedHtml = renderedHtml.replace(ifRegex, "");
            }
        }

        processConditional("logo_url", variables.logo_url);

        return { html: renderedHtml, subject: renderedSubject }
    }
}
