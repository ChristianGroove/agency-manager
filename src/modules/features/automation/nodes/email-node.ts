import { ContextManager } from '../context-manager';

export interface EmailNodeData {
    to: string; // Supports {{variable}}
    subject: string;
    body: string; // HTML or plain text
    from?: string;
    replyTo?: string;
    cc?: string;
    bcc?: string;
}

export class EmailNode {
    private data: EmailNodeData;
    private contextManager: ContextManager;

    constructor(data: EmailNodeData, contextManager: ContextManager) {
        this.data = data;
        this.contextManager = contextManager;
    }

    async execute(): Promise<void> {
        // Resolve variables from context
        const to = this.contextManager.resolve(this.data.to);
        const subject = this.contextManager.resolve(this.data.subject);
        const body = this.contextManager.resolve(this.data.body);
        const from = this.data.from || process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com';
        const replyTo = this.data.replyTo ? this.contextManager.resolve(this.data.replyTo) : undefined;
        const cc = this.data.cc ? this.contextManager.resolve(this.data.cc) : undefined;
        const bcc = this.data.bcc ? this.contextManager.resolve(this.data.bcc) : undefined;

        console.log(`[EmailNode] Sending email to: ${to}`);

        try {
            // For now, we'll use fetch to call Resend API directly
            // In production, you should install 'resend' package
            // and use: const resend = new Resend(process.env.RESEND_API_KEY);

            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from,
                    to,
                    subject,
                    html: body,
                    reply_to: replyTo,
                    cc: cc ? [cc] : undefined,
                    bcc: bcc ? [bcc] : undefined
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Failed to send email: ${error.message}`);
            }

            const result = await response.json();

            // Store email ID in context for tracking
            this.contextManager.set('emailId', result.id);

            console.log(`[EmailNode] Email sent successfully. ID: ${result.id}`);
        } catch (error) {
            console.error('[EmailNode] Failed to send email:', error);
            throw new Error(`Email sending failed: ${(error as Error).message}`);
        }
    }
}
