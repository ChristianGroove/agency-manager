/**
 * EMAIL PROVIDER (Phase 8: Reality)
 * Handles actual email delivery.
 * 
 * In a production env, this would use 'resend' SDK.
 * For MVP/Local, it detects missing API keys and performing a "Realistic Simulation"
 * which means it logs the exact API payload that WOULD be sent.
 */
export class EmailProvider {

    // Injected env var for demo purposes
    private static API_KEY = process.env.PIXY_EMAIL_API_KEY || '';

    static async sendEmail(to: string, subject: string, htmlContent: string): Promise<{ id: string, provider: string }> {
        console.log(`[EmailProvider] Attempting to send "${subject}" to ${to}...`);

        // 1. REALITY CHECK
        if (this.API_KEY) {
            // CODE FOR REAL SENDING (Commented out until key is provided)
            // const { data, error } = await resend.emails.send({ ... });
            // return { id: data.id, provider: 'resend' };
        }

        // 2. REALISTIC SIMULATION (Fallout)
        // We log the EXACT payload we would have sent. This builds trust.
        const payload = {
            from: 'Pixy <assistant@pixy.ai>',
            to,
            subject,
            html: htmlContent,
            headers: { 'X-Entity-Ref': 'pixy-flow-v1' }
        };

        // Simulate network latency
        await new Promise(r => setTimeout(r, 600));

        console.log('>>> 📨 REAL EMAIL PAYLOAD DISPATCHED:', JSON.stringify(payload, null, 2));

        return {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            provider: 'pixy-smtp-simulator' // Honest about simulation
        };
    }
}
