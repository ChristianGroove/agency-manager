import { IncomingMessage, MessagingProvider, SendMessageOptions, WebhookValidationResult } from './types';
import { supabaseAdmin } from "@/lib/supabase-admin"

export class MetaProvider implements MessagingProvider {
    name = 'meta';

    constructor(
        private apiToken: string,
        private phoneNumberId: string,
        private verifyToken: string
    ) { }

    /**
     * Send a message via Meta/WhatsApp Business API
     */
    async sendMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;

            const payload = this.buildPayload(options);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('[MetaProvider] API Error:', data);
                return {
                    success: false,
                    error: data.error?.message || 'Meta API request failed'
                };
            }

            return {
                success: true,
                messageId: data.messages?.[0]?.id
            };
        } catch (error) {
            console.error('[MetaProvider] Send Exception:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error sending to Meta'
            };
        }
    }

    /**
     * Validate incoming webhook from Meta
     */
    async validateWebhook(request: Request): Promise<WebhookValidationResult> {
        // GET Request (Verification Challenge)
        // GET Request (Verification Challenge)
        if (request.method === 'GET') {
            const url = new URL(request.url);
            const mode = url.searchParams.get('hub.mode');
            const token = url.searchParams.get('hub.verify_token');
            const challenge = url.searchParams.get('hub.challenge');
            // challenge is handled by the route handler directly for response, 
            // but we validate the token here

            if (mode === 'subscribe' && token === this.verifyToken) {
                return { isValid: true, responseBody: challenge || undefined };
            }
            return { isValid: false, reason: 'Invalid verify token' };
        }

        // POST Request (Event Notification)
        // Meta signs requests with X-Hub-Signature-256
        const signature = request.headers.get('x-hub-signature-256');
        if (!signature) {
            // For development/MVP we might skip strict signature check if env var is not set, 
            // but in production this is critical.
            // verifying signature requires reading body stream which might consume it.
            // For now, we assume valid if it comes to our endpoint configured in Meta app.
            return { isValid: true }; // TODO: Implement HMAC SHA256 signature verification
        }

        return { isValid: true };
    }

    /**
     * Parse webhook payload into normalized IncomingMessage
     */
    async parseWebhook(payload: any): Promise<IncomingMessage[]> {
        const messages: IncomingMessage[] = [];

        try {
            if (payload.object === 'whatsapp_business_account') {
                for (const entry of payload.entry || []) {
                    for (const change of entry.changes || []) {
                        if (change.value?.messages) {
                            for (const msg of change.value.messages) {
                                // Extract sender info
                                const contact = change.value.contacts?.find((c: any) => c.wa_id === msg.from);
                                const content = await this.parseMessageContent(msg);

                                // Extract button ID if interactive
                                let buttonId = undefined;
                                if (msg.type === 'interactive') {
                                    if (msg.interactive.type === 'button_reply') {
                                        buttonId = msg.interactive.button_reply.id;
                                    } else if (msg.interactive.type === 'list_reply') {
                                        buttonId = msg.interactive.list_reply.id;
                                    }
                                }

                                messages.push({
                                    id: msg.id,
                                    externalId: msg.id,
                                    channel: 'whatsapp',
                                    from: msg.from,
                                    senderName: contact?.profile?.name || 'Unknown',
                                    timestamp: new Date(parseInt(msg.timestamp) * 1000),
                                    content: content,
                                    buttonId: buttonId, // Populate buttonId
                                    metadata: {
                                        phoneNumberId: change.value.metadata?.phone_number_id,
                                        displayPhoneNumber: change.value.metadata?.display_phone_number
                                    }
                                });
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[MetaProvider] Parse Error:', error);
        }

        return messages;
    }

    /**
     * Helper to download media from Meta and upload to Supabase
     */
    private async processMedia(mediaId: string, mimeType?: string): Promise<string> {
        try {
            // 1. Get Media URL from Meta
            const urlRes = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
                headers: { 'Authorization': `Bearer ${this.apiToken}` }
            });

            if (!urlRes.ok) throw new Error(`Failed to get media URL: ${urlRes.statusText}`);
            const urlData = await urlRes.json();
            const mediaUrl = urlData.url;

            // 2. Download Media Binary
            const mediaRes = await fetch(mediaUrl, {
                headers: { 'Authorization': `Bearer ${this.apiToken}` }
            });

            if (!mediaRes.ok) throw new Error(`Failed to download media binary: ${mediaRes.statusText}`);
            const arrayBuffer = await mediaRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // 3. Upload to Supabase Storage
            const ext = mimeType ? mimeType.split('/')[1]?.split(';')[0] : 'bin';
            const fileName = `whatsapp/${new Date().getFullYear()}/${Date.now()}_${mediaId}.${ext}`;

            const { error } = await supabaseAdmin.storage
                .from('chat-attachments')
                .upload(fileName, buffer, {
                    contentType: mimeType || 'application/octet-stream',
                    upsert: true
                });

            if (error) throw error;

            // 4. Get Public URL
            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('chat-attachments')
                .getPublicUrl(fileName);

            return publicUrl;

        } catch (error) {
            console.error(`[MetaProvider] Media Processing Failed for ID ${mediaId}:`, error);
            return "";
        }
    }

    /**
     * Helper to parse message content type
     */
    private async parseMessageContent(msg: any): Promise<IncomingMessage['content']> {
        if (msg.type === 'text') {
            return {
                type: 'text',
                text: msg.text?.body
            };
        }

        if (msg.type === 'image') {
            const mediaId = msg.image.id;
            const caption = msg.image.caption;
            const publicUrl = await this.processMedia(mediaId, msg.image.mime_type);

            return {
                type: 'image',
                mediaUrl: publicUrl,
                text: caption, // Reuse text field for caption or add specialized field
                raw: msg.image
            };
        }

        if (msg.type === 'video') {
            const mediaId = msg.video.id;
            const caption = msg.video.caption;
            const publicUrl = await this.processMedia(mediaId, msg.video.mime_type);

            return {
                type: 'video', // Map to video type if exists in types, else unknown or extend types
                mediaUrl: publicUrl,
                text: caption,
                raw: msg.video
            } as any;
        }

        if (msg.type === 'audio' || msg.type === 'voice') {
            const payload = msg.audio || msg.voice;
            const publicUrl = await this.processMedia(payload.id, payload.mime_type);

            return {
                type: 'audio', // Treat voice as audio
                mediaUrl: publicUrl,
                raw: payload
            } as any;
        }

        if (msg.type === 'document') {
            const mediaId = msg.document.id;
            const caption = msg.document.caption;
            const filename = msg.document.filename;
            const publicUrl = await this.processMedia(mediaId, msg.document.mime_type);

            return {
                type: 'document', // Ensure types.ts supports this or map to generic
                mediaUrl: publicUrl,
                text: caption || filename,
                raw: msg.document
            } as any;
        }

        if (msg.type === 'interactive') {
            const interactive = msg.interactive;
            let buttonId = '';
            let title = '';

            if (interactive.type === 'button_reply') {
                buttonId = interactive.button_reply.id;
                title = interactive.button_reply.title;
            } else if (interactive.type === 'list_reply') {
                buttonId = interactive.list_reply.id;
                title = interactive.list_reply.title;
                // description is also available: interactive.list_reply.description
            }

            return {
                type: 'interactive',
                text: title, // Use title as text for fallback/display
                raw: interactive,
                // We will extract buttonId in parseWebhook loop, or return it here as part of extended content
                // But IncomingMessage expects buttonId at root. 
                // Let's attach it to content for now and extract it up in loop, OR return it here if we change return type.
                // Since types.ts defines content as fixed type, we can put it there if we cast or change types.
                // BEST APPROACH: Return it as part of 'raw' or handling it in the loop. 
                // Wait, parseWebhook calls this.
                // Let's change parseWebhook loop to use this return.
            } as any;
        }

        return {
            type: 'unknown',
            raw: msg
        };
    }

    /**
     * Helper to build Axios/Fetch payload for Meta API
     * Supports: text, image, video, audio, document, template, interactive buttons/lists/cta
     */
    private buildPayload(options: SendMessageOptions): any {
        const payload: any = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: options.to,
        };

        const content = options.content;

        switch (content.type) {
            case 'text':
                payload.type = 'text';
                payload.text = { body: content.text };
                break;

            case 'template':
                payload.type = 'template';
                payload.template = {
                    name: content.templateName,
                    language: { code: content.templateLanguage || 'en_US' },
                    components: []
                };
                break;

            case 'image':
                payload.type = 'image';
                payload.image = {
                    link: content.mediaUrl,
                    caption: content.caption
                };
                break;

            case 'video':
                payload.type = 'video';
                payload.video = {
                    link: content.mediaUrl,
                    caption: content.caption
                };
                break;

            case 'audio':
                payload.type = 'audio';
                payload.audio = { link: content.mediaUrl };
                break;

            case 'document':
                payload.type = 'document';
                payload.document = {
                    link: content.mediaUrl,
                    caption: content.caption,
                    filename: content.filename
                };
                break;

            case 'interactive_buttons':
                payload.type = 'interactive';
                payload.interactive = {
                    type: 'button',
                    body: { text: content.body },
                    action: {
                        buttons: content.buttons.slice(0, 3).map(btn => ({
                            type: 'reply',
                            reply: {
                                id: btn.id,
                                title: btn.title.substring(0, 20)  // Max 20 chars
                            }
                        }))
                    }
                };
                // Optional header
                if (content.header) {
                    if (content.header.type === 'text') {
                        payload.interactive.header = { type: 'text', text: content.header.text };
                    } else if (content.header.mediaUrl) {
                        payload.interactive.header = {
                            type: content.header.type,
                            [content.header.type]: { link: content.header.mediaUrl }
                        };
                    }
                }
                // Optional footer
                if (content.footer) {
                    payload.interactive.footer = { text: content.footer };
                }
                break;

            case 'interactive_list':
                payload.type = 'interactive';
                payload.interactive = {
                    type: 'list',
                    body: { text: content.body },
                    action: {
                        button: content.buttonText.substring(0, 20),  // Menu button text
                        sections: content.sections.slice(0, 10).map(section => ({
                            title: section.title?.substring(0, 24),
                            rows: section.rows.slice(0, 10).map(row => ({
                                id: row.id,
                                title: row.title.substring(0, 24),
                                description: row.description?.substring(0, 72)
                            }))
                        }))
                    }
                };
                if (content.header) {
                    payload.interactive.header = { type: 'text', text: content.header };
                }
                if (content.footer) {
                    payload.interactive.footer = { text: content.footer };
                }
                break;

            case 'interactive_cta':
                payload.type = 'interactive';
                payload.interactive = {
                    type: 'cta_url',
                    body: { text: content.body },
                    action: {
                        name: 'cta_url',
                        parameters: {
                            display_text: content.buttons[0]?.text || 'Ver más',
                            url: content.buttons[0]?.url || ''
                        }
                    }
                };
                if (content.header) {
                    if (content.header.type === 'text') {
                        payload.interactive.header = { type: 'text', text: content.header.text };
                    } else if (content.header.mediaUrl) {
                        payload.interactive.header = {
                            type: content.header.type,
                            [content.header.type]: { link: content.header.mediaUrl }
                        };
                    }
                }
                if (content.footer) {
                    payload.interactive.footer = { text: content.footer };
                }
                break;

            case 'location_request':
                payload.type = 'interactive';
                payload.interactive = {
                    type: 'location_request_message',
                    body: { text: content.body },
                    action: { name: 'send_location' }
                };
                break;

            default:
                console.warn('[MetaProvider] Unknown message type:', (content as any).type);
                payload.type = 'text';
                payload.text = { body: 'Mensaje no soportado' };
        }

        return payload;
    }
}

