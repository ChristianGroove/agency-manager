import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-admin';

const resend = new Resend(process.env.RESEND_API_KEY);

export type EmailOptions = {
    to: string | string[];
    subject: string;
    html: string;
    organizationId: string;
    userId?: string; // Optional, system emails might not match a specific user session
    attachments?: {
        filename: string;
        content: Buffer | string;
    }[];
    tags?: { name: string; value: string }[];
};

export class EmailService {
    /**
     * Sends an email with organization-specific branding and logging.
     */
    static async send(options: EmailOptions) {
        const { to, subject, html, organizationId, userId, attachments, tags } = options;

        try {
            // 1. Resolve Branding
            const { senderName, replyTo } = await this.getSenderIdentity(organizationId);

            // Default "From" address (Must be verified in Resend dashboard)
            // For true white-labeling, we would check organization.custom_domain here
            const fromEmail = 'notifications@pixy.com.co'; // Or similar verified domain
            const from = `"${senderName}" <${fromEmail}>`;

            // 2. Send via Resend
            const { data, error } = await resend.emails.send({
                from,
                to,
                replyTo: replyTo || undefined,
                subject,
                html,
                attachments,
                tags: [
                    ...(tags || []),
                    { name: 'organization_id', value: organizationId }
                ]
            });

            if (error) {
                console.error('[EmailService] Resend Error:', error);
                await this.logEmail({
                    organizationId,
                    userId,
                    recipient: Array.isArray(to) ? to.join(', ') : to,
                    subject,
                    status: 'failed',
                    errorMessage: error.message,
                    metadata: { error }
                });
                return { success: false, error };
            }

            // 3. Log Success
            await this.logEmail({
                organizationId,
                userId,
                recipient: Array.isArray(to) ? to.join(', ') : to,
                subject,
                status: 'sent',
                providerId: data?.id,
                metadata: { resendId: data?.id }
            });

            return { success: true, data };

        } catch (err: any) {
            console.error('[EmailService] Unexpected Error:', err);
            await this.logEmail({
                organizationId,
                userId,
                recipient: Array.isArray(to) ? to.join(', ') : to,
                subject,
                status: 'failed',
                errorMessage: err.message,
                metadata: { error: err }
            });
            return { success: false, error: err };
        }
    }

    /**
     * Resolves the sender identity based on organization settings.
     */
    private static async getSenderIdentity(organizationId: string) {
        try {
            // Parallel fetch for speed
            const [orgResponse, settingsResponse] = await Promise.all([
                supabaseAdmin.from('organizations').select('name').eq('id', organizationId).single(),
                supabaseAdmin.from('organization_settings').select('email_sender_name, email_reply_to').eq('organization_id', organizationId).single()
            ]);

            const orgName = orgResponse.data?.name || 'Pixy';
            const settings: any = settingsResponse.data || {};

            return {
                senderName: settings.email_sender_name || orgName,
                replyTo: settings.email_reply_to
            };
        } catch (error) {
            console.warn('[EmailService] Error resolving branding, using defaults:', error);
            return { senderName: 'Pixy', replyTo: undefined };
        }
    }

    /**
     * Logs the email attempt to the database.
     */
    private static async logEmail(data: {
        organizationId: string,
        userId?: string,
        recipient: string,
        subject: string,
        status: 'sent' | 'failed',
        providerId?: string,
        errorMessage?: string,
        metadata?: any
    }) {
        try {
            await supabaseAdmin.from('email_logs').insert({
                organization_id: data.organizationId,
                user_id: data.userId || null,
                recipient: data.recipient,
                subject: data.subject,
                status: data.status,
                provider_id: data.providerId,
                error_message: data.errorMessage,
                metadata: data.metadata || {}
            });
        } catch (error) {
            // Non-blocking error logging
            console.error('[EmailService] Failed to insert log:', error);
        }
    }
}
