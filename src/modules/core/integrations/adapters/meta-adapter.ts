import { IntegrationAdapter, ConnectionCredentials, VerificationResult } from "./types"

export class MetaAdapter implements IntegrationAdapter {
    key = "meta_whatsapp"

    async verifyCredentials(credentials: ConnectionCredentials): Promise<VerificationResult> {
        const { phoneNumberId, accessToken } = credentials

        if (!phoneNumberId || !accessToken) {
            return { isValid: false, error: "Missing Phone Number ID or Access Token" }
        }

        try {
            // Verify token and phone ID by fetching phone number details
            const response = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}`, {
                headers: {
                    "Authorization": `Bearer ${accessToken}`
                }
            })

            const data = await response.json()

            if (response.ok && data.id === phoneNumberId) {
                return {
                    isValid: true,
                    metadata: {
                        display_phone_number: data.display_phone_number,
                        verified_name: data.verified_name,
                        quality_rating: data.quality_rating
                    }
                }
            } else {
                return {
                    isValid: false,
                    error: data.error?.message || "Invalid Credentials or Permissions"
                }
            }
        } catch (err: any) {
            return { isValid: false, error: `Verification Failed: ${err.message}` }
        }
    }

    async checkConnectionStatus(credentials: ConnectionCredentials): Promise<{ status: 'active' | 'inactive' | 'error', message?: string }> {
        // Reuse verification logic loosely
        const result = await this.verifyCredentials(credentials)
        if (result.isValid) {
            return { status: 'active' }
        }
        return { status: 'error', message: result.error || 'Connection failed' }
    }

    async sendMessage(credentials: ConnectionCredentials | string, recipient: string, content: any): Promise<{ messageId: string, metadata?: any }> {
        const { decryptCredentials } = await import('@/modules/core/integrations/encryption');

        let creds: any = credentials;
        if (typeof creds === 'string') {
            try { creds = JSON.parse(creds); } catch (e) { throw new Error("Invalid credentials format"); }
        }
        creds = decryptCredentials(creds);

        const phoneNumberId = creds.phoneNumberId || creds.phone_number_id;
        const accessToken = creds.accessToken || creds.access_token;

        if (!phoneNumberId || !accessToken) throw new Error("Missing Meta credentials (ID or Token)")

        const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`

        // Simple text support for now
        const textBody = typeof content === 'string' ? content : content.text || JSON.stringify(content)

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: recipient,
                type: "text",
                text: { body: textBody }
            })
        })

        if (!response.ok) {
            const err = await response.json()
            throw new Error(`Meta Send Failed: ${err.error?.message || response.statusText}`)
        }

        const data = await response.json()
        return {
            messageId: data.messages?.[0]?.id || Date.now().toString(),
            metadata: data
        }
    }
}
