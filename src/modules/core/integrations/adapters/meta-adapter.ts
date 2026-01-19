import { IntegrationAdapter, ConnectionCredentials, VerificationResult } from "./types"

export class MetaAdapter implements IntegrationAdapter {
    key = "meta_business" // Unified Key

    async verifyCredentials(credentials: ConnectionCredentials): Promise<VerificationResult> {
        // ... (Verification logic can remain or be improved later)
        const { phoneNumberId, accessToken, pageId } = credentials

        if ((!phoneNumberId && !pageId) || !accessToken) {
            return { isValid: false, error: "Missing Phone Number ID/Page ID or Access Token" }
        }
        return { isValid: true }
    }

    async checkConnectionStatus(credentials: ConnectionCredentials): Promise<{ status: 'active' | 'inactive' | 'error', message?: string }> {
        const result = await this.verifyCredentials(credentials)
        if (result.isValid) {
            return { status: 'active' }
        }
        return { status: 'error', message: result.error || 'Connection failed' }
    }

    async sendMessage(credentials: ConnectionCredentials | string, recipient: string, content: any): Promise<{ messageId: string, metadata?: any }> {
        const { decryptObject } = await import('@/modules/core/integrations/encryption');

        let creds: any = credentials;
        if (typeof creds === 'string') {
            try { creds = JSON.parse(creds); } catch (e) { throw new Error("Invalid credentials format"); }
        }
        creds = decryptObject(creds);

        const phoneNumberId = creds.phoneNumberId || creds.phone_number_id;
        const pageId = creds.pageId || creds.page_id;
        const accessToken = creds.accessToken || creds.access_token;

        if ((!phoneNumberId && !pageId) || !accessToken) throw new Error("Missing Meta credentials (ID or Token)")

        // Determine if Messenger/IG or WhatsApp
        // If pageId is present, assume Messenger (or logic based on recipient format?)
        // Ideally we should know the channel, but without it we guess based on creds.
        // If BOTH exist, we default to WhatsApp unless recipient looks like PSID?
        // PSIDs are usually just numbers, but so are phones.
        // But phones usually have +? e.164.
        // Cleanity uses PSIDs for Messenger.

        // Better heuristic: If pageId is present, prefer Messenger logic if we can't be sure?
        // Or check if recipient has '+' prefix? WhatsApp requires it usually (or country code).
        // PSIDs don't.

        const isMessenger = !!pageId;

        let url = '';
        let payload: any = {};

        const textBody = typeof content === 'string' ? content : content.text || JSON.stringify(content);

        if (isMessenger) {
            // Messenger / Instagram
            // Use /me/messages or /PAGE_ID/messages
            // If it is Instagram, it might need different endpoint? 
            // Usually valid Page Access Token works for both via Graph API node.

            // Note: For Instagram Scoped ID, we might need /IG_ID/messages?
            // But usually we treat them as Page conversations.

            url = `https://graph.facebook.com/v19.0/${pageId}/messages`; // Use explicit Page ID

            payload = {
                recipient: { id: recipient },
                message: { text: textBody },
                messaging_type: "RESPONSE" // Good practice for 24h window
            };
        } else {
            // WhatsApp
            url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
            payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: recipient,
                type: "text",
                text: { body: textBody }
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const err = await response.json()
            console.error('[MetaAdapter] Send Error:', err);
            throw new Error(`Meta Send Failed: ${err.error?.message || response.statusText}`)
        }

        const data = await response.json()
        return {
            messageId: data.messages?.[0]?.id || data.message_id || Date.now().toString(),
            metadata: data
        }
    }
}
