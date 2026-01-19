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

    async sendMessage(credentials: ConnectionCredentials | string, recipient: string, content: any, metadata?: any): Promise<{ messageId: string, metadata?: any }> {
        const { decryptObject } = await import('@/modules/core/integrations/encryption');

        let creds: any = credentials;
        if (typeof creds === 'string') {
            try { creds = JSON.parse(creds); } catch (e) { throw new Error("Invalid credentials format"); }
        }
        creds = decryptObject(creds);

        // Merge passed metadata (context) with credentials defaults
        const phoneNumberId = metadata?.phoneNumberId || creds.phoneNumberId || creds.phone_number_id;
        const pageId = metadata?.pageId || creds.pageId || creds.page_id;
        const accessToken = creds.accessToken || creds.access_token;

        if ((!phoneNumberId && !pageId) || !accessToken) throw new Error("Missing Meta credentials (ID or Token)")

        const isMessenger = !!pageId;
        const pageOrIgId = pageId; // Alias for clarity if needed

        let effectiveToken = accessToken;


        let url = '';
        let payload: any = {};

        const textBody = typeof content === 'string' ? content : content.text || '';
        const buttons = typeof content === 'object' && content.buttons ? content.buttons : [];

        if (isMessenger) {
            // Messenger / Instagram
            url = `https://graph.facebook.com/v19.0/${pageId}/messages`;

            // Auto-fetch Page Access Token if we only have User Token
            if (pageId) {
                try {
                    // console.log(`[MetaAdapter] Fetching Page Token for ${pageId}...`);
                    const tokenResp = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=access_token`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    if (tokenResp.ok) {
                        const d = await tokenResp.json();
                        if (d.access_token) {
                            effectiveToken = d.access_token;
                            // console.log(`[MetaAdapter] Used Page Token.`);
                        }
                    }
                } catch (e) { console.warn("[MetaAdapter] Token fetch error", e); }
            }

            if (buttons.length > 0) {
                // Button Template
                payload = {
                    recipient: { id: recipient },
                    message: {
                        attachment: {
                            type: "template",
                            payload: {
                                template_type: "button",
                                text: textBody,
                                buttons: buttons.map((b: any) => ({
                                    type: "postback",
                                    title: b.label,
                                    payload: b.id
                                }))
                            }
                        }
                    },
                    messaging_type: "RESPONSE"
                };
            } else {
                // Text Message
                payload = {
                    recipient: { id: recipient },
                    message: { text: textBody },
                    messaging_type: "RESPONSE"
                };
            }

        } else {
            // WhatsApp
            url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

            if (buttons.length > 0) {
                // Interactive Button Message
                payload = {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: recipient,
                    type: "interactive",
                    interactive: {
                        type: "button",
                        body: { text: textBody },
                        action: {
                            buttons: buttons.map((b: any) => ({
                                type: "reply",
                                reply: {
                                    id: b.id,
                                    title: b.label
                                }
                            }))
                        }
                    }
                };
            } else {
                // Text Message
                payload = {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: recipient,
                    type: "text",
                    text: { body: textBody }
                };
            }
        }

        console.log(`[MetaAdapter] Sending to ${url} | Payload:`, JSON.stringify(payload));

        const makeRequest = async (p: any) => {
            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${effectiveToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(p)
            })
            return resp
        }

        let response = await makeRequest(payload)

        // Fallback for Buttons: If failed, try basic text
        if (!response.ok && buttons.length > 0) {
            const err = await response.clone().json().catch(() => ({}))
            console.warn(`[MetaAdapter] Button send failed (${response.status}). Retrying with text only. Error:`, err);

            // Construct text-only payload
            if (isMessenger) {
                payload = {
                    recipient: { id: recipient },
                    message: { text: textBody },
                    messaging_type: "RESPONSE"
                };
            } else {
                payload = {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: recipient,
                    type: "text",
                    text: { body: textBody }
                };
            }
            response = await makeRequest(payload)
        }

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
