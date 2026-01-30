import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getEffectiveBranding } from '@/modules/core/branding/actions';
import { EmailBranding } from '@/lib/email-templates';
import nodemailer from 'nodemailer';
import { decrypt } from '@/lib/encryption';

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
            // 1. Resolve Branding & Identity
            const { senderName, replyTo, branding } = await this.getSenderIdentity(organizationId);

            // 2. Determine Transport Strategy (SMTP vs System/Resend)
            const smtpConfig = await this.getSmtpConfig(organizationId);

            let messageId: string | undefined;

            if (smtpConfig && smtpConfig.is_verified) {
                // === A. CUSTOM SMTP STRATEGY ===
                try {
                    const decryptedPass = decrypt(smtpConfig.password_encrypted, smtpConfig.iv);
                    const transporter = nodemailer.createTransport({
                        host: smtpConfig.host,
                        port: smtpConfig.port,
                        secure: smtpConfig.port === 465,
                        auth: {
                            user: smtpConfig.user_email,
                            pass: decryptedPass
                        }
                    });

                    const fromName = smtpConfig.from_name || senderName;
                    const fromEmail = smtpConfig.from_email || smtpConfig.user_email;

                    const info = await transporter.sendMail({
                        from: `"${fromName}" <${fromEmail}>`,
                        to: Array.isArray(to) ? to.join(', ') : to,
                        replyTo,
                        subject,
                        html,
                        attachments: attachments as any
                    });

                    messageId = info.messageId;

                } catch (smtpError: any) {
                    console.error('[EmailService] SMTP Custom Error:', smtpError);
                    // Decide if we want to fallback or fail. 
                    // Usually if they configured SMTP, they WANT it to fail if it breaks, not fallback silently to System.
                    throw new Error(`Error enviando por SMTP personalizado: ${smtpError.message}`);
                }

            } else {
                // === B. SYSTEM DEFAULT (RESEND) ===
                let fromEmail = process.env.RESEND_FROM_EMAIL || 'notifications@pixy.com.co';

                // Domain is verified! We can use it in Dev too.

                const from = `"${senderName}" <${fromEmail}>`;

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
                    // Resend specific error handling
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

                messageId = data?.id;
            }

            // 3. Log Success
            await this.logEmail({
                organizationId,
                userId,
                recipient: Array.isArray(to) ? to.join(', ') : to,
                subject,
                status: 'sent',
                providerId: messageId,
                metadata: {
                    provider: smtpConfig ? 'custom_smtp' : 'resend',
                    provider_host: smtpConfig?.host
                }
            });

            return { success: true, data: { id: messageId } };

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
     * Fetch encrypted SMTP config for org (internal use)
     */
    private static async getSmtpConfig(organizationId: string) {
        const { data } = await supabaseAdmin
            .from('organization_smtp_configs')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_verified', true)
            .single();
        return data;
    }

    /**
     * Resolves the sender identity AND branding based on organization settings.
     */
    private static async getSenderIdentity(organizationId: string): Promise<{
        senderName: string;
        replyTo: string | undefined;
        branding: EmailBranding;
    }> {
        try {
            // Get effective branding (handles both Platform and Tenant White Label Logic)
            const brandingData = await getEffectiveBranding(organizationId);

            // Fetch raw settings for reply-to (not part of visual branding usually)
            const { data: settings } = await supabaseAdmin
                .from('organization_settings')
                .select('email_reply_to')
                .eq('organization_id', organizationId)
                .single();

            // Map to EmailBranding interface
            const emailBranding: EmailBranding = {
                agency_name: brandingData.name,
                primary_color: brandingData.colors.primary,
                secondary_color: brandingData.colors.secondary,
                logo_url: brandingData.logos.main || undefined, // Emails look better with Main logo than Icon
                website_url: brandingData.website || 'https://www.pixy.com.co',
                footer_text: `© ${new Date().getFullYear()} ${brandingData.name}. Todos los derechos reservados.`
            };

            return {
                senderName: brandingData.name, // Use branding name as sender name
                replyTo: settings?.email_reply_to || undefined,
                branding: emailBranding
            };
        } catch (error) {
            console.warn('[EmailService] Error resolving branding, using defaults:', error);
            // Fallback
            return {
                senderName: 'Pixy',
                replyTo: undefined,
                branding: {
                    agency_name: 'Pixy',
                    primary_color: '#4F46E5',
                    secondary_color: '#EC4899',
                    website_url: 'https://www.pixy.com.co'
                }
            };
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
