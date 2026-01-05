import { supabaseAdmin } from "@/lib/supabase-admin";
import { transporter, SENDER_EMAIL } from "@/lib/email/mailer";

interface EmailContext {
    organizationId?: string;
    verticalSlug?: string;
}

export const emailService = {
    async sendEmail(
        to: string,
        templateSlug: string,
        variables: Record<string, string>,
        context?: EmailContext
    ) {
        console.log(`[EmailService] Sending '${templateSlug}' to ${to}`);

        // 1. Resolve Template (Hierarchy: Org -> Vertical -> Global)
        // We fetch all potential matches and pick the most specific one in code logic
        // or via clever SQL. Doing simple fetch for simplicity.

        const { data: templates, error } = await supabaseAdmin
            .from('email_templates')
            .select('*')
            .eq('slug', templateSlug)
            .or(`organization_id.eq.${context?.organizationId},organization_id.is.null`)
            .or(`vertical_slug.eq.${context?.verticalSlug},vertical_slug.is.null`);

        if (error || !templates || templates.length === 0) {
            console.error(`[EmailService] Template '${templateSlug}' not found!`, error);
            throw new Error(`Template not found: ${templateSlug}`);
        }

        // Filter logic: Best Match
        // Priority: 
        // 1. Match Org + Vertical
        // 2. Match Org
        // 3. Match Vertical
        // 4. Global (both null)

        const bestTemplate = templates.sort((a, b) => {
            const scoreA = (a.organization_id ? 4 : 0) + (a.vertical_slug ? 2 : 0);
            const scoreB = (b.organization_id ? 4 : 0) + (b.vertical_slug ? 2 : 0);
            return scoreB - scoreA;
        })[0];

        if (!bestTemplate) throw new Error("No suitable template found");

        // 2. Variable Substitution
        let htmlInfo = bestTemplate.body_html;
        let subjectInfo = bestTemplate.subject;

        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            htmlInfo = htmlInfo.replace(regex, value || '');
            subjectInfo = subjectInfo.replace(regex, value || '');
        });

        // 3. Send via Nodemailer
        try {
            const info = await transporter.sendMail({
                from: SENDER_EMAIL,
                to,
                subject: subjectInfo,
                html: htmlInfo,
            });

            console.log(`[EmailService] Sent successfully. ID: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (err: any) {
            console.error(`[EmailService] Nodemailer error:`, err);
            return { success: false, error: err.message };
        }
    }
};
