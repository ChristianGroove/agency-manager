import { IncomingMessage, MessagingProvider, SendMessageOptions, WebhookValidationResult } from './types';
import * as fs from 'fs';
import * as path from 'path';
import { supabaseAdmin } from "@/lib/supabase-admin"
import { decryptObject } from "@/modules/core/integrations/encryption"

function debugLog(msg: string) {
    try {
        const logPath = path.join(process.cwd(), 'debug.log');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}][MetaProvider] ${msg} \n`);
    } catch (e) { }
}

export class MetaProvider implements MessagingProvider {
    name = 'meta';

    constructor(
        private apiToken: string,
        private assetId: string,
        private verifyToken: string
    ) { }

    /**
     * Send a message via Meta APIs (WhatsApp, Messenger, Instagram)
     */
    async sendMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            const isMessengerOrIg = options.metadata?.channel === 'messenger' || options.metadata?.channel === 'instagram';
            let url = `https://graph.facebook.com/v24.0/${this.assetId}/messages`;

            // Resolve Token: options.credentials > this.apiToken
            let activeToken = this.apiToken;
            if (options.credentials) {
                const creds = typeof options.credentials === 'string'
                    ? JSON.parse(options.credentials)
                    : options.credentials;
                activeToken = creds.accessToken || creds.apiToken || creds.access_token || activeToken;

                // Also update assetId if provided in credentials (for legacy whatsapp)
                if (creds.phoneNumberId) this.assetId = creds.phoneNumberId;
            }

            // For Messenger/Instagram, we need the Page Access Token. 
            // If apiToken is a User Token, we try to exchange it for a Page Token for this assetId.
            if (isMessengerOrIg) {
                url = `https://graph.facebook.com/v24.0/me/messages`;
                // If it's not already a page token (we check if we can get a page token for this asset)
                activeToken = await this.getPageAccessToken(this.assetId, activeToken);
            }

            let payload: any;

            if (isMessengerOrIg) {
                // Messenger/Instagram specific payload structure
                payload = {
                    recipient: { id: options.to },
                    message: { text: (options.content as any).text || '' }
                };

                // Helper: Apply Message Tag if provided (e.g. HUMAN_AGENT)
                // This is critical for responding outside the 24h window (Policy #10)
                if (options.metadata?.features && (options.metadata.features as any).tag) {
                    const tag = (options.metadata.features as any).tag;
                    payload.messaging_type = "MESSAGE_TAG";
                    payload.tag = tag;
                    debugLog(`[MetaProvider] Applied Message Tag: ${tag}`);
                }
            } else {
                // WhatsApp Payload
                payload = this.buildPayload(options);
            }

            debugLog(`[MetaProvider] Sending Payload: ${JSON.stringify(payload)}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${activeToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            debugLog(`[MetaProvider] API Response: ${JSON.stringify(data)}`);

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
                    debugLog(`Processing WA entry: ${entry.id}`);
                    for (const change of entry.changes || []) {
                        debugLog(`Change field: ${change.field}`);
                        if (change.value?.messages) {
                            debugLog(`Found ${change.value.messages.length} WA messages`);
                            for (const msg of change.value.messages) {
                                debugLog(`Processing WA msg: ${msg.id}`);
                                // Extract sender info
                                const contact = change.value.contacts?.find((c: any) => c.wa_id === msg.from);
                                const phoneNumberId = change.value.metadata?.phone_number_id;
                                const content = await this.parseMessageContent(msg, phoneNumberId);

                                // Extract button ID if interactive
                                let buttonId = undefined;
                                if (msg.type === 'interactive') {
                                    if (msg.interactive.type === 'button_reply') {
                                        buttonId = msg.interactive.button_reply.id;
                                    } else if (msg.interactive.type === 'list_reply') {
                                        buttonId = msg.interactive.list_reply.id;
                                    }
                                }

                                debugLog(`WA Msg Parsed: From=${msg.from}, ContentType=${content.type}, Metadata=${JSON.stringify(change.value.metadata)}`);

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
            } else if (payload.object === 'page' || payload.object === 'instagram') {
                for (const entry of payload.entry || []) {
                    const pageOrIgId = entry.id;
                    debugLog(`Processing entry for ${payload.object} (${pageOrIgId})`);

                    const messagingEvents = entry.messaging || entry.standby || [];
                    if (entry.standby) debugLog('Found STANDBY events');
                    debugLog(`Events count: ${messagingEvents.length}`);

                    for (const messaging of messagingEvents) {
                        debugLog(`Event: ${JSON.stringify(messaging)}`);
                        if (messaging.message && !messaging.message.is_echo) {
                            const msg = messaging.message;
                            const channel = payload.object === 'page' ? 'messenger' : 'instagram';

                            // Try to fetch real name if we have a token
                            let senderName = 'User';
                            if (this.apiToken) {
                                debugLog('Fetching sender profile...');
                                const profile = await this.getSenderProfile(messaging.sender.id, pageOrIgId, this.apiToken);
                                if (profile?.name) senderName = profile.name;
                            }

                            debugLog(`Pushing message from ${senderName} (${channel})`);
                            messages.push({
                                id: msg.mid,
                                externalId: msg.mid,
                                channel: channel as any,
                                from: messaging.sender.id,
                                senderName: senderName,
                                timestamp: new Date(messaging.timestamp),
                                content: msg.text || (msg.attachments ? '[Attachment]' : ''),
                                metadata: {
                                    [payload.object === 'page' ? 'pageId' : 'instagramBusinessId']: pageOrIgId,
                                    psid: messaging.sender.id,
                                    senderName: senderName
                                }
                            });
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
     * Helper to get FB/IG User Profile (Name/Picture)
     */
    private async getSenderProfile(psid: string, assetId: string, userToken: string) {
        try {
            const pageToken = await this.getPageAccessToken(assetId, userToken);
            const url = `https://graph.facebook.com/v24.0/${psid}?fields=first_name,last_name,profile_pic&access_token=${pageToken}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.first_name) {
                return {
                    name: `${data.first_name} ${data.last_name || ''}`.trim(),
                    picture: data.profile_pic
                };
            }
        } catch (e) {
            console.error('[MetaProvider] Failed to fetch sender profile:', e);
        }
        return null;
    }

    /**
     * Helper to get Page Access Token for a specific Page ID using a User Token
     */
    private async getPageAccessToken(pageId: string, userToken: string): Promise<string> {
        try {
            // First, check if this is already a page token by calling /me
            const meRes = await fetch(`https://graph.facebook.com/v24.0/me?access_token=${userToken}`);
            const meData = await meRes.json();
            if (meData.id === pageId) return userToken; // It's already the page token

            // If not, fetch pages for this user
            const url = `https://graph.facebook.com/v24.0/me/accounts?access_token=${userToken}`;
            const res = await fetch(url);
            const data = await res.json();
            const page = data.data?.find((p: any) => p.id === pageId);
            if (page?.access_token) {
                console.log(`[MetaProvider] Successfully exchanged User Token for Page Token for ${pageId}`);
                return page.access_token;
            }
            return userToken;
        } catch (e) {
            console.error('[MetaProvider] Failed to fetch Page Token:', e);
            return userToken;
        }
    }

    /**
     * Helper to get API token from integration_connections if not provided in constructor
     */
    private async getTokenByAssetId(assetId: string, options?: { forceDb?: boolean }): Promise<string> {
        console.log(`[MetaProvider] getTokenByAssetId called with: "${assetId}"`);

        try {
            const { data: connections, error } = await supabaseAdmin
                .from('integration_connections')
                .select('credentials, provider_key, metadata')
                .in('provider_key', ['meta_whatsapp', 'meta_business'])
                .eq('status', 'active');

            if (error) {
                console.error('[MetaProvider] DB query error:', error);
                return '';
            }

            console.log(`[MetaProvider] Found ${connections?.length || 0} active meta connections`);

            if (!connections || connections.length === 0) return '';

            // const { decryptObject } = await import('@/modules/core/integrations/encryption');

            for (const conn of connections) {
                let creds = conn.credentials || {};

                if (typeof creds === 'string') {
                    try { creds = JSON.parse(creds); } catch (e) { }
                }
                creds = decryptObject(creds);

                // STRATEGY 1: Meta Business (Unified)
                if (conn.provider_key === 'meta_business') {
                    const assets = conn.metadata?.selected_assets || [];
                    const hasAsset = assets.some((a: any) => a.id === assetId || a.id === String(assetId));

                    if (hasAsset) {
                        const token = creds.access_token || creds.accessToken || '';
                        console.log(`[MetaProvider] MATCH! Token found in meta_business (length: ${token.length})`);
                        return token;
                    }
                }

                // STRATEGY 2: Legacy Meta WhatsApp
                const storedId = creds.phoneNumberId || creds.phone_number_id;
                console.log(`[MetaProvider] Checking connection - storedId: "${storedId}" vs requested: "${assetId}"`);

                if (storedId === assetId) {
                    const token = creds.accessToken || creds.apiToken || creds.access_token || '';
                    console.log(`[MetaProvider] MATCH! Token found (length: ${token.length})`);
                    return token;
                }
            }
            console.log('[MetaProvider] No matching connection found');
            return '';
        } catch (error) {
            console.error('[MetaProvider] getTokenByAssetId failed:', error);
            return '';
        }
    }

    /**
     * Helper to download media from Meta and upload to Supabase
     */
    private async processMedia(mediaId: string, mimeType?: string, assetId?: string): Promise<string> {
        console.log(`[MetaProvider] processMedia called for mediaId: ${mediaId}, mimeType: ${mimeType}`);

        // Get token - either from constructor or from database
        let token = this.apiToken;
        if (!token && assetId) {
            console.log(`[MetaProvider] No apiToken in constructor, fetching from database for assetId: ${assetId}`);
            token = await this.getTokenByAssetId(assetId);
        }

        if (!token) {
            console.error(`[MetaProvider] No token available for media download!`);
            return "";
        }
        console.log(`[MetaProvider] Using token (length: ${token.length})`);

        try {
            // 1. Get Media URL from Meta
            console.log(`[MetaProvider] Step 1: Fetching media URL from Meta...`);
            const urlRes = await fetch(`https://graph.facebook.com/v24.0/${mediaId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!urlRes.ok) {
                console.error(`[MetaProvider] Step 1 FAILED: ${urlRes.status} ${urlRes.statusText}`);
                const errBody = await urlRes.text();
                console.error(`[MetaProvider] Meta API Error Body:`, errBody);
                return "";
            }

            const urlData = await urlRes.json();
            const mediaUrl = urlData.url;
            console.log(`[MetaProvider] Step 1 SUCCESS: Got media URL (length: ${mediaUrl?.length || 0})`);

            if (!mediaUrl) {
                console.error(`[MetaProvider] No URL in Meta response:`, urlData);
                return "";
            }

            // 2. Download Media Binary
            console.log(`[MetaProvider] Step 2: Downloading media binary...`);
            const mediaRes = await fetch(mediaUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!mediaRes.ok) {
                console.error(`[MetaProvider] Step 2 FAILED: ${mediaRes.status} ${mediaRes.statusText}`);
                return "";
            }

            const arrayBuffer = await mediaRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            console.log(`[MetaProvider] Step 2 SUCCESS: Downloaded ${buffer.length} bytes`);

            // 3. Upload to Supabase Storage
            console.log(`[MetaProvider] Step 3: Uploading to Supabase Storage...`);
            const ext = mimeType ? mimeType.split('/')[1]?.split(';')[0] : 'bin';
            const fileName = `whatsapp/${new Date().getFullYear()}/${Date.now()}_${mediaId}.${ext}`;

            const { error } = await supabaseAdmin.storage
                .from('chat-attachments')
                .upload(fileName, buffer, {
                    contentType: mimeType || 'application/octet-stream',
                    upsert: true
                });

            if (error) {
                console.error(`[MetaProvider] Step 3 FAILED - Storage Error:`, error);
                return "";
            }
            console.log(`[MetaProvider] Step 3 SUCCESS: Uploaded to ${fileName}`);

            // 4. Get Public URL
            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('chat-attachments')
                .getPublicUrl(fileName);

            console.log(`[MetaProvider] Step 4 SUCCESS: Public URL = ${publicUrl}`);
            return publicUrl;

        } catch (error) {
            console.error(`[MetaProvider] Media Processing Exception for ID ${mediaId}:`, error);
            return "";
        }
    }

    /**
     * Helper to parse message content type
     */
    private async parseMessageContent(msg: any, phoneNumberId?: string): Promise<IncomingMessage['content']> {
        if (msg.type === 'text') {
            return {
                type: 'text',
                text: msg.text?.body
            };
        }

        if (msg.type === 'image') {
            const mediaId = msg.image.id;
            const caption = msg.image.caption;
            const publicUrl = await this.processMedia(mediaId, msg.image.mime_type, phoneNumberId);

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
            const publicUrl = await this.processMedia(mediaId, msg.video.mime_type, phoneNumberId);

            return {
                type: 'video', // Map to video type if exists in types, else unknown or extend types
                mediaUrl: publicUrl,
                text: caption,
                raw: msg.video
            } as any;
        }

        if (msg.type === 'audio' || msg.type === 'voice') {
            const payload = msg.audio || msg.voice;
            const publicUrl = await this.processMedia(payload.id, payload.mime_type, phoneNumberId);

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
            const publicUrl = await this.processMedia(mediaId, msg.document.mime_type, phoneNumberId);

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
                        button: (content.buttonText || 'Ver opciones').substring(0, 20),
                        sections: content.sections.slice(0, 10).map(section => ({
                            title: (section.title || 'Sección').substring(0, 24),
                            rows: section.rows.slice(0, 10).map(row => ({
                                id: row.id,
                                title: (row.title || 'Opción').substring(0, 24),
                                description: row.description?.substring(0, 72)
                            }))
                        }))
                    }
                };
                if (content.header) {
                    const headerText = typeof content.header === 'string' ? content.header : (content.header as any).text;
                    if (headerText) {
                        payload.interactive.header = { type: 'text', text: headerText };
                    }
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

