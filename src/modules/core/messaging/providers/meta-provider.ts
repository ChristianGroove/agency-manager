import { 
    MessagingProvider, 
    SendMessageOptions, 
    IncomingMessage, 
    InteractiveButtonsContent,
    InteractiveListContent,
    InteractiveCTAContent,
    InteractiveCallRequestContent,
    WebhookValidationResult
} from "./types";

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

            const url = `https://graph.facebook.com/v24.0/${effectiveAssetId}/messages`;
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
            const url = `https://graph.facebook.com/v24.0/me/messages`;
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
                payload.text = { body: ct.text || ct.body || '' };
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
                payload.text = { body: ct.body || ct.text || String(content) };
        }

        return payload;
    }

    /**
     * Upload media to Meta servers
     */
    private async uploadMedia(url: string, token: string, type: string, assetId: string): Promise<string | null> {
        try {
            console.log(`[MetaProvider] Uploading media: ${url} (${type})`);
            const uploadUrl = `https://graph.facebook.com/v24.0/${assetId}/media`;
            
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

    async parseWebhook(payload: any): Promise<any[]> {
        const messages: any[] = [];
        
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
                            mediaUrl = media.id; 
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

                    const msg = value.message || {};
                    const postback = value.postback || {};
                    
                    let type = 'text';
                    let text = msg.text || postback.title || '';
                    let mediaUrl = '';
                    let buttonId = msg.quick_reply?.payload || postback.payload || '';

                    if (msg.attachments) {
                        const attachment = msg.attachments[0];
                        type = attachment.type;
                        mediaUrl = attachment.payload?.url || '';
                    }

                    messages.push({
                        id: msg.mid || `pb_${value.timestamp}_${from}`,
                        externalId: msg.mid || `pb_${value.timestamp}`,
                        channel: payload.object === 'instagram' ? 'instagram' : 'messenger',
                        from: from,
                        senderName: 'Social User',
                        buttonId,
                        content: { type: type === 'fallback' ? 'text' : type, text, mediaUrl },
                        timestamp: new Date(value.timestamp || Date.now()),
                        origin: isEcho ? 'outbound' : 'inbound',
                        metadata: { 
                            raw: value,
                            pageId: pageId // CRITICAL for resolver
                        }
                    });
                }
            }
        }

        console.log(`[MetaProvider] parseWebhook extracted ${messages.length} messages`);
        return messages;
    }
}
