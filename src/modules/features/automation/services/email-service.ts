'use server';

/**
 * Email Service - Resend Integration
 * 
 * This service handles sending emails using the Resend API.
 * Environment variables required:
 * - RESEND_API_KEY: Your Resend API key
 * - EMAIL_FROM: Default sender email address
 */

interface SendEmailParams {
    to: string | string[];
    subject: string;
    body: string;
    html?: string;
    from?: string;
    replyTo?: string;
    cc?: string | string[];
    bcc?: string | string[];
}

interface SendEmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

const RESEND_API_URL = 'https://api.resend.com/emails';

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const defaultFrom = process.env.EMAIL_FROM || 'noreply@example.com';

    if (!apiKey) {
        console.error('[EmailService] RESEND_API_KEY not configured');
        return {
            success: false,
            error: 'Email service not configured. Please set RESEND_API_KEY environment variable.'
        };
    }

    try {
        const payload = {
            from: params.from || defaultFrom,
            to: Array.isArray(params.to) ? params.to : [params.to],
            subject: params.subject,
            text: params.body,
            html: params.html || params.body.replace(/\n/g, '<br>'),
            reply_to: params.replyTo,
            cc: params.cc ? (Array.isArray(params.cc) ? params.cc : [params.cc]) : undefined,
            bcc: params.bcc ? (Array.isArray(params.bcc) ? params.bcc : [params.bcc]) : undefined,
        };

        console.log('[EmailService] Sending email:', {
            to: payload.to,
            subject: payload.subject,
            from: payload.from
        });

        const response = await fetch(RESEND_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[EmailService] Resend API error:', data);
            return {
                success: false,
                error: data.message || `HTTP ${response.status}: ${response.statusText}`
            };
        }

        console.log('[EmailService] Email sent successfully:', data.id);

        return {
            success: true,
            messageId: data.id
        };
    } catch (error) {
        console.error('[EmailService] Failed to send email:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error sending email'
        };
    }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    // Allow template variables like {{lead.email}}
    if (email.includes('{{') && email.includes('}}')) {
        return true;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Send template-based email
 */
export async function sendTemplateEmail(
    to: string,
    templateName: string,
    variables: Record<string, string>
): Promise<SendEmailResult> {
    // Email templates can be defined here or fetched from database
    const templates: Record<string, { subject: string; body: string }> = {
        welcome: {
            subject: '¡Bienvenido a {{company_name}}!',
            body: `Hola {{name}},\n\nGracias por unirte a {{company_name}}.\n\nSaludos,\nEl equipo`
        },
        lead_nurture: {
            subject: 'Seguimiento: {{subject}}',
            body: `Hola {{name}},\n\n{{message}}\n\nSaludos,\n{{sender_name}}`
        },
        reminder: {
            subject: 'Recordatorio: {{title}}',
            body: `Hola {{name}},\n\nEste es un recordatorio sobre: {{details}}\n\nSaludos`
        }
    };

    const template = templates[templateName];
    if (!template) {
        return {
            success: false,
            error: `Template '${templateName}' not found`
        };
    }

    // Replace variables in template
    let subject = template.subject;
    let body = template.body;

    Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
        body = body.replace(new RegExp(placeholder, 'g'), value);
    });

    return sendEmail({ to, subject, body });
}
