import { ContextManager } from '../context-manager';

export interface SMSNodeData {
    to: string; // Supports {{variable}} - phone number
    body: string; // SMS message text
    from?: string; // Twilio phone number
}

export class SMSNode {
    private data: SMSNodeData;
    private contextManager: ContextManager;

    constructor(data: SMSNodeData, contextManager: ContextManager) {
        this.data = data;
        this.contextManager = contextManager;
    }

    async execute(): Promise<void> {
        // Resolve variables from context
        const to = this.contextManager.resolve(this.data.to);
        const body = this.contextManager.resolve(this.data.body);
        const from = this.data.from || process.env.TWILIO_PHONE_NUMBER || '';

        // Validate phone number format (basic)
        if (!this.isValidPhoneNumber(to)) {
            throw new Error(`Invalid phone number format: ${to}`);
        }

        console.log(`[SMSNode] Sending SMS to: ${to}`);

        try {
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;

            if (!accountSid || !authToken) {
                throw new Error('Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)');
            }

            // Create Basic Auth header
            const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

            // Send SMS via Twilio API
            const response = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        To: to,
                        From: from,
                        Body: body
                    })
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Twilio API error: ${error.message || response.statusText}`);
            }

            const result = await response.json();

            // Store message SID in context for tracking
            this.contextManager.set('smsId', result.sid);
            this.contextManager.set('smsStatus', result.status);

            console.log(`[SMSNode] SMS sent successfully. SID: ${result.sid}`);
        } catch (error) {
            console.error('[SMSNode] Failed to send SMS:', error);
            throw new Error(`SMS sending failed: ${(error as Error).message}`);
        }
    }

    private isValidPhoneNumber(phone: string): boolean {
        // Basic validation: must start with + and have 10-15 digits
        const phoneRegex = /^\+[1-9]\d{9,14}$/;
        return phoneRegex.test(phone);
    }
}
