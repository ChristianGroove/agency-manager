import { IntegrationAdapter, ConnectionCredentials, VerificationResult } from "./types"

export class MetaAdapter implements IntegrationAdapter {
    key: string;

    constructor(key: string = "meta_business") {
        this.key = key;
    }

    async verifyCredentials(credentials: ConnectionCredentials): Promise<VerificationResult> {
        const { phoneNumberId, accessToken, pageId, assetId, instagramBusinessId } = credentials

        if ((!phoneNumberId && !pageId && !assetId && !instagramBusinessId) || !accessToken) {
            return { isValid: false, error: "Missing Asset ID (Phone/Page/IG) or Access Token" }
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
        console.log(`[MetaAdapter] START sendMessage to ${recipient} | Meta:`, JSON.stringify(metadata));
        const { decryptObject } = await import('@/modules/core/integrations/encryption');

        let creds: any = credentials;
        if (typeof creds === 'string') {
            try { creds = JSON.parse(creds); } catch (e) { throw new Error("Invalid credentials format"); }
        }
        creds = decryptObject(creds);

        // Merge passed metadata (context) with credentials defaults
        const phoneNumberId = metadata?.phoneNumberId || creds.phoneNumberId || creds.phone_number_id;
        const pageId = metadata?.pageId || creds.pageId || creds.page_id || creds.assetId || creds.instagramBusinessId;
        const accessToken = creds.accessToken || creds.access_token;

        console.log(`[MetaAdapter] Resolved IDs - WA: ${phoneNumberId}, Page/IG: ${pageId}, HasToken: ${!!accessToken}`);

        if ((!phoneNumberId && !pageId) || !accessToken) {
            console.error('[MetaAdapter] CRITICAL: Missing IDs or Token', { phoneNumberId, pageId, hasToken: !!accessToken });
            throw new Error("Missing Meta credentials (ID or Token)");
        }

        const isMessenger = !!pageId;
        const pageOrIgId = pageId; 

        let effectiveToken = accessToken;

        let url = '';
        let payload: any = {};

        const contentObj = typeof content === 'string' ? { type: 'text', text: content } : content;
        const textBody = contentObj.text || '';
        const buttons = contentObj.buttons || [];

        if (isMessenger) {
            // Messenger / Instagram
            url = `https://graph.facebook.com/v24.0/me/messages`; // Standard endpoint

            // Auto-fetch Page Access Token if we only have User Token
            try {
                const tokenResp = await fetch(`https://graph.facebook.com/v24.0/${pageId}?fields=access_token`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                if (tokenResp.ok) {
                    const d = await tokenResp.json();
                    if (d.access_token) effectiveToken = d.access_token;
                }
            } catch (e) { console.warn("[MetaAdapter] Token fetch error", e); }

            payload = {
                recipient: { id: recipient },
                message: {},
                messaging_type: "RESPONSE"
            };

            // Handle Media in Messenger
            const mediaTypes = ['image', 'video', 'audio', 'file', 'sticker'];
            if (mediaTypes.includes(contentObj.type) && contentObj.mediaUrl) {
                payload.message.attachment = {
                    type: contentObj.type === 'sticker' ? 'image' : contentObj.type,
                    payload: {
                        url: contentObj.mediaUrl,
                        is_reusable: true
                    }
                };
            } else if (contentObj.type === 'interactive_buttons') {
                payload.message.text = contentObj.body || 'Opciones:';
                payload.message.quick_replies = (contentObj.buttons || []).slice(0, 13).map((btn: any) => ({
                    content_type: 'text',
                    title: btn.title.substring(0, 20),
                    payload: btn.id
                }));
            } else if (contentObj.type === 'interactive_list') {
                payload.message.text = contentObj.body || 'Selecciona una opción:';
                // Flatten list rows into quick replies (max 13 supported by Meta)
                const allRows = (contentObj.sections || []).flatMap((s: any) => s.rows).slice(0, 13);
                if (allRows.length > 0) {
                    payload.message.quick_replies = allRows.map((row: any) => ({
                        content_type: 'text',
                        title: row.title.substring(0, 20),
                        payload: row.id
                    }));
                }
            } else if (contentObj.type === 'interactive_cta') {
                const ctaUrl = contentObj.buttons?.[0]?.url || contentObj.buttons?.[0]?.phoneNumber || '';
                // Fallback direct URL inside text since IG doesn't support complex CTAs like Messenger
                payload.message.text = `${contentObj.body || ''}\n\n👉 Enlace: ${ctaUrl}`;
            } else if (buttons.length > 0) {
                // Legacy Button Template (if passed manually)
                payload.message.attachment = {
                    type: "template",
                    payload: {
                        template_type: "button",
                        text: textBody || 'Selecciona una opción:',
                        buttons: buttons.map((b: any) => ({
                            type: "postback",
                            title: b.label.substring(0, 20),
                            payload: b.id
                        }))
                    }
                };
            } else {
                payload.message.text = textBody || ' ';
            }

        } else {
            // WhatsApp logic remains similar but reinforced
            url = `https://graph.facebook.com/v24.0/${phoneNumberId}/messages`;
            
            if (contentObj.type === 'image' || contentObj.type === 'video' || contentObj.type === 'audio' || contentObj.type === 'document') {
                const type = contentObj.type;
                payload = {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: recipient,
                    type: type,
                    [type]: { link: contentObj.mediaUrl, caption: contentObj.caption }
                };
            } else if (buttons.length > 0) {
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
                                reply: { id: b.id, title: b.label.substring(0, 20) }
                            }))
                        }
                    }
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
        }

        console.log(`[MetaAdapter] Sending to ${url} | Payload:`, JSON.stringify(payload));

        const { globalCircuitBreaker } = await import('@/lib/integrations/circuit-breaker');

        return await globalCircuitBreaker.execute('meta_api', async () => {
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
        });
    }
}
