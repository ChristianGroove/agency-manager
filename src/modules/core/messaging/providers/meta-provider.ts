import { supabaseAdmin } from "@/lib/supabase-admin";
import { decryptObject } from "@/modules/core/integrations/encryption";
import { 
    MessagingProvider, 
    SendMessageOptions, 
    IncomingMessage, 
    IncomingCall,
    InteractiveButtonsContent,
    InteractiveListContent,
    InteractiveCTAContent,
    InteractiveCallRequestContent,
    WebhookValidationResult
} from "./types";

export class MetaProvider implements MessagingProvider {
    name = 'meta';
    private profileCache: Record<string, { name: string, expires: number }> = {};

    constructor(
        private apiToken: string,
        private assetId: string,
        private verifyToken: string
    ) { }

    /**
     * Internal helper to resolve Meta Media IDs to public URLs via Supabase Storage
     */
    private async processMedia(mediaId: string, mimeType: string, assetId?: string): Promise<string> {
        try {
            console.log(`[MetaProvider] Processing Media ID: ${mediaId} (${mimeType}) AssetId: ${assetId}`);
            
            // 1. Resolve Token for this AssetId if possible
            let token = this.apiToken;
            if (assetId) {
                const dbToken = await this.getTokenByAssetId(assetId);
                if (dbToken) {
                    token = dbToken;
                    console.log(`[MetaProvider] Using DB token for ${assetId}`);
                }
            }

            if (!token) {
                console.error(`[MetaProvider] No token available for media resolution!`);
                return "";
            }

            // 2. Get Download URL from Meta
            // NOTE: We explicitly use Graph API v24.0 for media resolution (IDs to URLs) 
            // as it has better support for newer media types and cross-account resolution.
            const urlRes = await fetch(`https://graph.facebook.com/v24.0/${mediaId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!urlRes.ok) {
                const err = await urlRes.json().catch(() => ({}));
                console.error(`[MetaProvider] Media ID resolution FAILED with token:`, err);
                
                // Fallback to constructor token if DB token failed
                if (token !== this.apiToken && this.apiToken) {
                    console.log(`[MetaProvider] Retrying with constructor token...`);
                    const retryRes = await fetch(`https://graph.facebook.com/v24.0/${mediaId}`, {
                        headers: { 'Authorization': `Bearer ${this.apiToken}` }
                    });
                    if (retryRes.ok) {
                        const { url } = await retryRes.json();
                        return await this.downloadAndUpload(url, mediaId, mimeType, this.apiToken);
                    }
                }
                return "";
            }

            const { url: downloadUrl } = await urlRes.json();
            if (!downloadUrl) return "";

            return await this.downloadAndUpload(downloadUrl, mediaId, mimeType, token);
        } catch (error) {
            console.error(`[MetaProvider] Media Processing Exception:`, error);
            return "";
        }
    }

    /**
     * Helper to download from Meta and upload to Supabase
     */
    private async downloadAndUpload(url: string, mediaId: string, mimeType: string, token: string): Promise<string> {
        try {
            // 1. Download Binary
            const mediaRes = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!mediaRes.ok) return "";
            const buffer = await mediaRes.arrayBuffer();

            // 2. Upload to Supabase Storage
            const extension = mimeType.split('/')[1]?.split(';')[0] || 'bin';
            const fileName = `whatsapp/${new Date().getFullYear()}/${Date.now()}_${mediaId}.${extension}`;
            const { error: uploadError } = await supabaseAdmin.storage
                .from('chat-attachments')
                .upload(fileName, buffer, { contentType: mimeType, upsert: true });

            if (uploadError) {
                console.error(`[MetaProvider] Supabase Media Upload Error:`, uploadError);
                return "";
            }

            // 3. Get Public URL
            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('chat-attachments')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            console.error(`[MetaProvider] downloadAndUpload Exception:`, error);
            return "";
        }
    }

    /**
     * Resolves the Meta API token for a specific Asset ID (Phone Number ID or Page ID).
     * 
     * DEV NOTE: 
     * 1. CRITICAL FOR PRODUCTION: Integration credentials in the DB are encrypted (AES-256-GCM).
     *    We MUST use decryptObject() to read the accessToken/phoneId. 
     * 2. TYPE SAFETY: Always cast IDs to String() before comparison to avoid numeric/string mismatch.
     * 3. MULTI-TENANT: Each WhatsApp account has its own token; this resolver ensures the 
     *    correct one is used based on the incoming webhook's metadata.
     */
    private async getTokenByAssetId(assetId: string): Promise<string | null> {
        try {
            const { data: connections, error } = await supabaseAdmin
                .from('integration_connections')
                .select('credentials, metadata')
                .in('provider_key', ['meta_whatsapp', 'whatsapp_cloud', 'facebook_page', 'instagram_dm'])
                .eq('status', 'active');

            if (error || !connections) return null;

            for (const conn of connections) {
                // DECRYPT credentials (critical for production where they are encrypted in DB)
                const creds = decryptObject(conn.credentials);
                const phoneId = String(creds?.phoneNumberId || creds?.phone_id || creds?.phoneId || conn.metadata?.asset_id || "");
                const pageId = String(creds?.pageId || creds?.page_id || conn.metadata?.page_id || "");

                if ((phoneId && phoneId === String(assetId)) || (pageId && pageId === String(assetId))) {
                    const token = creds.accessToken || creds.apiToken || creds.access_token || null;
                    if (token) return token;
                }
            }
            console.error(`[MetaProvider] No active connection found for AssetId: ${assetId}`);
            return null;
        } catch (error) {
            console.error(`[MetaProvider] getTokenByAssetId Error:`, error);
            return null;
        }
    }

    /**
     * Send a message via Meta APIs (WhatsApp, Messenger, Instagram)
     */
    async sendMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
        console.log(`[MetaProvider] sendMessage called. Channel: ${options.metadata?.channel}, To: ${options.to}`);
        const channel = options.metadata?.channel as string;
        const isMessengerOrIg = ['messenger', 'instagram', 'facebook_page', 'instagram_dm'].includes(channel);
        
        if (isMessengerOrIg) {
            return this.sendFacebookMessage(options);
        } else {
            return this.sendWhatsAppMessage(options);
        }
    }

    /**
     * Internal WhatsApp Sender logic
     */
    private async sendWhatsAppMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            let effectiveAssetId = this.assetId;
            let activeToken = this.apiToken;

            if (options.credentials) {
                const creds = typeof options.credentials === 'string' ? JSON.parse(options.credentials) : options.credentials;
                activeToken = creds.accessToken || creds.apiToken || creds.access_token || activeToken;
                if (creds.phoneNumberId) effectiveAssetId = creds.phoneNumberId;
            }

            const url = `https://graph.facebook.com/v21.0/${effectiveAssetId}/messages`;
            const content = options.content as any;
            const mediaTypes = ['audio', 'image', 'video', 'document', 'sticker'];
            
            if (mediaTypes.includes(content.type) && content.mediaUrl && !content.mediaId) {
                const mediaId = await this.uploadMedia(content.mediaUrl, activeToken, content.type, effectiveAssetId);
                if (mediaId) content.mediaId = mediaId;
            }

            if (content.type === 'sticker') {
                // Sticker validation placeholder
            }

            const payload = this.buildPayload(options);
            console.log('[MetaProvider] Sending to WhatsApp:', JSON.stringify(payload, null, 2));
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${activeToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) {
                console.error('[MetaProvider] WA API Error:', data);
                return { success: false, error: data.error?.message || 'WhatsApp API Error' };
            }

            return { success: true, messageId: data.messages?.[0]?.id };
        } catch (error) {
            console.error('[MetaProvider] WA Send Exception:', error);
            return { success: false, error: error instanceof Error ? error.message : 'WhatsApp Send Exception' };
        }
    }

    /**
     * Internal Messenger/Instagram Sender logic
     */
    private async sendFacebookMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            const url = `https://graph.facebook.com/v21.0/me/messages`;
            const content = options.content as any;
            let activeToken = this.apiToken;
            let pageId = this.assetId;

            if (options.credentials) {
                const creds = typeof options.credentials === 'string' ? JSON.parse(options.credentials) : options.credentials;
                activeToken = creds.accessToken || creds.apiToken || creds.access_token || activeToken;
                if (creds.pageId) pageId = creds.pageId;
            }

            const payload: any = {
                recipient: { id: options.to },
                message: {}
            };

            // String content handling
            if (typeof content === 'string') {
                payload.message.text = content;
            } 
            // Interactive Buttons (Messenger Quick Replies)
            else if (content.type === 'interactive_buttons') {
                const buttonContent = content as InteractiveButtonsContent;
                payload.message.text = buttonContent.body || 'Opciones:';
                payload.message.quick_replies = buttonContent.buttons.slice(0, 13).map(btn => ({
                    content_type: 'text',
                    title: (btn.title || 'Opción').substring(0, 20),
                    payload: btn.id
                }));
            } else if (content.type === 'interactive_list') {
                const listContent = content as InteractiveListContent;
                payload.message.text = listContent.body || 'Opciones:';
                const allRows = listContent.sections.flatMap(s => s.rows);
                if (allRows.length > 0) {
                    payload.message.quick_replies = allRows.map(row => ({
                        content_type: 'text',
                        title: (row.title || 'Opción').substring(0, 20),
                        payload: row.id
                    }));
                }
            }
            // Media
            else if (['image', 'video', 'audio', 'document', 'sticker'].includes(content.type)) {
                payload.message.attachment = {
                    type: content.type === 'sticker' ? 'image' : content.type,
                    payload: {
                        url: content.mediaUrl,
                        is_selectable: true
                    }
                };
            }
            // Standard Text
            else {
                payload.message.text = content.text || content.body || '';
            }

            const response = await fetch(activeToken.startsWith('EA') ? url : `${url}?access_token=${activeToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) {
                console.error('[MetaProvider] Social API Error:', data);
                return { success: false, error: data.error?.message || 'Social API Error' };
            }

            return { success: true, messageId: data.message_id || data.id };
        } catch (error) {
            console.error('[MetaProvider] Social Send Exception:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Social Send Exception' };
        }
    }

    /**
     * Helper to build Axios/Fetch payload for WhatsApp Cloud API
     */
    private buildPayload(options: SendMessageOptions): any {
        const { content, to } = options;
        
        const payload: any = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
        };

        // 1. Handle Simple String Content
        if (typeof content === 'string') {
            payload.type = 'text';
            payload.text = { body: content };
            return payload;
        }

        // 2. Handle Object-based Content
        const ct = content as any;
        const type = ct.type || 'text';

        switch (type) {
            case 'text':
                payload.type = 'text';
                payload.text = { body: ct.text || ct.body || 'Hola (Pixy Bot)' };
                break;

            case 'template':
                payload.type = 'template';
                payload.template = {
                    name: ct.templateName,
                    language: { code: ct.templateLanguage || 'en_US' },
                    components: ct.templateComponents || []
                };
                if (ct.time_to_live) {
                    (payload.template as any).time_to_live = ct.time_to_live;
                }
                break;

            case 'image':
                payload.type = 'image';
                if (ct.mediaId) {
                    payload.image = { id: ct.mediaId, caption: ct.caption };
                } else {
                    payload.image = { link: ct.mediaUrl, caption: ct.caption };
                }
                break;

            case 'video':
                payload.type = 'video';
                if (ct.mediaId) {
                    payload.video = { id: ct.mediaId, caption: ct.caption };
                } else {
                    payload.video = { link: ct.mediaUrl, caption: ct.caption };
                }
                break;

            case 'audio':
                payload.type = 'audio';
                if (ct.mediaId) {
                    payload.audio = { id: ct.mediaId };
                } else {
                    payload.audio = { link: ct.mediaUrl };
                }
                break;

            case 'document':
                payload.type = 'document';
                if (ct.mediaId) {
                    payload.document = { id: ct.mediaId, caption: ct.caption, filename: ct.filename };
                } else {
                    payload.document = { link: ct.mediaUrl, caption: ct.caption, filename: ct.filename };
                }
                break;

            case 'sticker':
                payload.type = 'sticker';
                if (ct.mediaId) {
                    payload.sticker = { id: ct.mediaId };
                } else {
                    payload.sticker = { link: ct.mediaUrl };
                }
                break;

            case 'interactive_buttons': {
                const btnContent = content as InteractiveButtonsContent;
                payload.type = 'interactive';
                payload.interactive = {
                    type: 'button',
                    body: { text: (btnContent.body || 'Selecciona una opción:').substring(0, 1024) },
                    action: {
                        buttons: btnContent.buttons.slice(0, 3).map(btn => ({
                            type: 'reply',
                            reply: {
                                id: btn.id,
                                title: (btn.title || 'Seleccionar').substring(0, 20)
                            }
                        }))
                    }
                };
                if (btnContent.header) {
                    if (btnContent.header.type === 'text') {
                        payload.interactive.header = { type: 'text', text: btnContent.header.text };
                    } else if (btnContent.header.mediaUrl) {
                        payload.interactive.header = {
                            type: btnContent.header.type,
                            [btnContent.header.type]: { link: btnContent.header.mediaUrl }
                        };
                    }
                }
                if (btnContent.footer) {
                    payload.interactive.footer = { text: btnContent.footer };
                }
                break;
            }

            case 'interactive_list': {
                const listContent = content as InteractiveListContent;
                payload.type = 'interactive';
                payload.interactive = {
                    type: 'list',
                    body: { text: (listContent.body || 'Selecciona una opción:').substring(0, 1024) },
                    action: {
                        button: (listContent.buttonText || 'Ver opciones').substring(0, 20),
                        sections: listContent.sections.slice(0, 10).map(section => ({
                            title: (section.title || 'Sección').substring(0, 24),
                            rows: section.rows.slice(0, 10).map(row => ({
                                id: row.id,
                                title: (row.title || 'Opción').substring(0, 24),
                                description: row.description?.substring(0, 72)
                            }))
                        }))
                    }
                };
                if (listContent.header) {
                    const headerText = typeof listContent.header === 'string' ? listContent.header : (listContent.header as any).text;
                    if (headerText) {
                        payload.interactive.header = { type: 'text', text: headerText };
                    }
                }
                if (listContent.footer) {
                    payload.interactive.footer = { text: listContent.footer };
                }
                break;
            }

            case 'interactive_cta': {
                const ctaContent = content as InteractiveCTAContent;
                payload.type = 'interactive';
                payload.interactive = {
                    type: 'cta_url',
                    body: { text: ctaContent.body },
                    action: {
                        name: 'cta_url',
                        parameters: {
                            display_text: (ctaContent.buttons[0]?.text || 'Ver más').substring(0, 20),
                            url: ctaContent.buttons[0]?.url || ''
                        }
                    }
                };
                if (ctaContent.header) {
                    if (ctaContent.header.type === 'text') {
                        payload.interactive.header = { type: 'text', text: ctaContent.header.text };
                    } else if (ctaContent.header.mediaUrl) {
                        payload.interactive.header = {
                            type: ctaContent.header.type,
                            [ctaContent.header.type]: { link: ctaContent.header.mediaUrl }
                        };
                    }
                }
                break;
            }

            default:
                // Fallback to text if unknown type
                payload.type = 'text';
                payload.text = { body: ct.body || ct.text || String(content) || 'Hola (Pixy Bot)' };
        }

        return payload;
    }

    /**
     * Upload media to Meta servers
     */
    private async uploadMedia(url: string, token: string, type: string, assetId: string): Promise<string | null> {
        try {
            console.log(`[MetaProvider] Uploading media: ${url} (${type})`);
            const uploadUrl = `https://graph.facebook.com/v21.0/${assetId}/media`;
            
            // 1. Fetch file
            const fileResp = await fetch(url);
            if (!fileResp.ok) throw new Error(`Failed to fetch media from URL: ${url}`);
            const buffer = await fileResp.arrayBuffer();
            const blob = new Blob([buffer]);

            // 2. Prepare Form Data
            const formData = new FormData();
            formData.append('file', blob, 'media-file');
            formData.append('type', type);
            formData.append('messaging_product', 'whatsapp');

            // 3. Upload
            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                console.error('[MetaProvider] Media Upload Error:', data);
                return null;
            }

            return data.id;
        } catch (error) {
            console.error('[MetaProvider] Media Upload Exception:', error);
            return null;
        }
    }

    /**
     * Fetches the user profile (name/username) from Meta Graph API.
     * 
     * NOTE: Messenger and Instagram webhooks do NOT include sender names.
     * This method resolves them using the Page/Instagram Access Token.
     * Results are cached for 1 hour to prevent API rate limiting.
     * 
     * @param psid Page-Scoped ID of the sender
     * @param assetId The Page ID or Instagram Business ID
     * @param channel The channel type ('messenger' or 'instagram')
     */
    private async fetchSocialProfile(psid: string, assetId: string, channel: string): Promise<{ name: string }> {
        const cacheKey = `${channel}:${psid}`;
        if (this.profileCache[cacheKey] && this.profileCache[cacheKey].expires > Date.now()) {
            return { name: this.profileCache[cacheKey].name };
        }

        try {
            const token = await this.getTokenByAssetId(assetId);
            if (!token) return { name: 'Social User' };

            // Fields vary by channel
            const fields = channel === 'instagram' ? 'username,name' : 'first_name,last_name,name';
            const url = `https://graph.facebook.com/v21.0/${psid}?fields=${fields}&access_token=${token}`;
            
            console.log(`[MetaProvider] Fetching profile for ${psid} on ${channel}...`);
            const res = await fetch(url);
            const data = await res.json();

            if (data.error) {
                console.warn(`[MetaProvider] Profile fetch error for ${psid}:`, data.error.message);
                return { name: 'Social User' };
            }

            let resolvedName = 'Social User';
            if (data.username) resolvedName = data.username;
            else if (data.first_name) resolvedName = `${data.first_name} ${data.last_name || ''}`.trim();
            else if (data.name) resolvedName = data.name;

            // Cache for 1 hour
            this.profileCache[cacheKey] = { name: resolvedName, expires: Date.now() + 3600000 };
            return { name: resolvedName };
        } catch (e) {
            console.error(`[MetaProvider] Profile Fetch Exception for ${psid}:`, e);
            return { name: 'Social User' };
        }
    }

    async validateWebhook(request: Request): Promise<WebhookValidationResult> {
        try {
            const url = new URL(request.url);
            const mode = url.searchParams.get('hub.mode');
            const token = url.searchParams.get('hub.verify_token');
            const challenge = url.searchParams.get('hub.challenge');

            if (mode === 'subscribe' && token === this.verifyToken) {
                return { isValid: true, responseBody: challenge || '' };
            }
            return { isValid: false, reason: 'Invalid verify token' };
        } catch (error: any) {
            return { isValid: false, reason: error.message };
        }
    }

    async parseWebhook(payload: any): Promise<(IncomingMessage | IncomingCall)[]> {
        const messages: (IncomingMessage | IncomingCall)[] = [];
        
        // 1. WhatsApp / Messenger / Instagram all come through 'entry'
        const entries = payload.entry || [];
        
        for (const entry of entries) {
            const changes = entry.changes || entry.messaging || [];
            
            for (const change of changes) {
                const value = change.value || change;
                if (!value) continue;

                // --- WhatsApp Parse ---
                if (value.messages) {
                    const phoneNumberId = value.metadata?.phone_number_id;

                    for (const msg of value.messages) {
                        const from = msg.from;
                        const contact = value.contacts?.find((c: any) => c.wa_id === from);
                        const senderName = contact?.profile?.name || 'WhatsApp User';
                        
                        let type = msg.type;
                        let text = '';
                        let mediaUrl = '';
                        let buttonId = '';

                        if (type === 'text') {
                            text = msg.text?.body || '';
                        } else if (type === 'interactive') {
                            const interact = msg.interactive;
                            if (interact.type === 'button_reply') {
                                buttonId = interact.button_reply?.id;
                                text = interact.button_reply?.title;
                            } else if (interact.type === 'list_reply') {
                                buttonId = interact.list_reply?.id;
                                text = interact.list_reply?.title;
                            }
                        } else if (['image', 'video', 'audio', 'document', 'sticker'].includes(type)) {
                            const media = msg[type];
                            text = media.caption || `[${type}]`;
                            const mediaId = media.id;
                            const mimeType = media.mime_type || (type === 'sticker' ? 'image/webp' : `${type}/jpeg`);
                            mediaUrl = await this.processMedia(mediaId, mimeType, phoneNumberId); 
                        }

                        const isEcho = phoneNumberId === from || msg.is_echo === true;
                        if (isEcho) console.log(`[MetaProvider] ???? Echo detected for WA message: ${msg.id}`);

                        messages.push({
                            id: msg.id,
                            externalId: msg.id,
                            channel: 'whatsapp',
                            from: isEcho ? (msg.to || phoneNumberId) : from,
                            senderName,
                            buttonId,
                            content: { type: type === 'interactive' ? 'interactive' : (['image','video','audio','document','sticker'].includes(type) ? type : 'text'), text, mediaUrl },
                            timestamp: new Date(parseInt(msg.timestamp) * 1000),
                            origin: isEcho ? 'outbound' : 'inbound',
                            metadata: { 
                                raw: msg,
                                phoneNumberId: phoneNumberId // CRITICAL for resolver
                            }
                        });
                    }
                }

                // --- Messenger / Instagram Parse ---
                if (value.message || value.postback) {
                    const pageId = entry.id; // Usually the page/ig id for messaging events
                    const from = value.sender?.id;
                    const isEcho = value.message?.is_echo;
                    if (isEcho) continue;

                    const msgData = value.message || {};
                    const postback = value.postback || {};
                    
                    let type = 'text';
                    let text = msgData.text || postback.title || '';
                    let mediaUrl = '';
                    let buttonId = msgData.quick_reply?.payload || postback.payload || '';

                    if (msgData.attachments) {
                        const attachment = msgData.attachments[0];
                        type = attachment.type;
                        mediaUrl = attachment.payload?.url || '';
                    }

                    const channel = payload.object === 'instagram' ? 'instagram' : 'messenger';
                    const { name: senderName } = await this.fetchSocialProfile(from, pageId, channel);

                    messages.push({
                        id: msgData.mid || `pb_${value.timestamp}_${from}`,
                        externalId: msgData.mid || `pb_${value.timestamp}`,
                        channel: channel,
                        from: from,
                        senderName: senderName,
                        buttonId,
                        content: { 
                            type: (type === 'fallback' ? 'text' : type) as any, 
                            text, 
                            mediaUrl 
                        },
                        timestamp: new Date(value.timestamp || Date.now()),
                        origin: isEcho ? 'outbound' : 'inbound',
                        metadata: { 
                            raw: value,
                            [payload.object === 'instagram' ? 'instagramBusinessId' : 'pageId']: pageId 
                        }
                    });
                }
            }
        }

        console.log(`[MetaProvider] parseWebhook extracted ${messages.length} messages`);
        return messages;
    }
}
