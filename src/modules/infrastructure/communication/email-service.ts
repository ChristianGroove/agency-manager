import { supabaseAdmin } from "@/modules/core/database/supabase-admin";
import { transporter, SENDER_EMAIL } from "@/modules/infrastructure/notifications/services/mailer";

const PUBLIC_EMAIL_SEND_ERROR = "No se pudo enviar el email";

interface EmailContext {
    organizationId?: string;
    verticalSlug?: string;
}

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV;
}

function summarizeEmailError(error: unknown) {
    if (error instanceof Error) return { name: error.name };

    if (error && typeof error === 'object') {
        return {
            code: (error as any).code,
            status: (error as any).status,
            statusCode: (error as any).statusCode,
            hasMessage: typeof (error as any).message === 'string' && (error as any).message.length > 0,
        };
    }

    return { type: typeof error };
}

function logEmailError(label: string, error: unknown) {
    console.error(label, isDeployedRuntime() ? summarizeEmailError(error) : error);
}

function emailFailure(error: unknown) {
    logEmailError(`[EmailService] Nodemailer error:`, error);

    if (isDeployedRuntime()) return { success: false, error: PUBLIC_EMAIL_SEND_ERROR };
    if (error instanceof Error) return { success: false, error: error.message };
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return { success: false, error: error.message };
    }
    return { success: false, error: PUBLIC_EMAIL_SEND_ERROR };
}

export const emailService = {
    async sendEmail(
        to: string,
        templateSlug: string,
        variables: Record<string, string>,
        context?: EmailContext
    ) {
        if (isDeployedRuntime()) {
            console.log(`[EmailService] Sending`, { templateSlug, recipientPresent: !!to });
        } else {
            console.log(`[EmailService] Sending '${templateSlug}' to ${to}`);
        }

        // 1. Resolve Template (Hierarchy: Org -> Vertical -> Global)
        // We fetch all potential matches and pick the most specific one in code logic
        // or via clever SQL. Doing simple fetch for simplicity.

        let query = supabaseAdmin
            .from('email_templates')
            .select('*')
            .eq('slug', templateSlug)

        if (context?.organizationId) {
            query = query.or(`organization_id.eq.${context.organizationId},organization_id.is.null`)
        } else {
            query = query.is('organization_id', null)
        }

        if (context?.verticalSlug) {
            query = query.or(`vertical_slug.eq.${context.verticalSlug},vertical_slug.is.null`)
        } else {
            query = query.is('vertical_slug', null)
        }

        const { data: templates, error } = await query

        if (error || !templates || templates.length === 0) {
            logEmailError(`[EmailService] Template not found`, error);
            throw new Error("Email template not found");
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

            if (isDeployedRuntime()) {
                console.log(`[EmailService] Sent successfully`, { messageIdPresent: !!info.messageId });
            } else {
                console.log(`[EmailService] Sent successfully. ID: ${info.messageId}`);
            }
            return { success: true, messageId: info.messageId };
        } catch (err: any) {
            return emailFailure(err);
        }
    }
};
