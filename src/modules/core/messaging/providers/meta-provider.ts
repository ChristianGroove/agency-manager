import * as fs from 'fs';
import * as path from 'path';
import { supabaseAdmin } from "@/lib/supabase-admin"
import { decryptObject } from "@/modules/core/integrations/encryption"
import { validateStickerUrl } from "@/lib/meta/sticker-validator"

import {
    MessagingProvider,
    SendMessageOptions,
    IncomingMessage,
    WebhookValidationResult,
    IncomingCall,
    InteractiveButtonsContent,
    InteractiveListContent,
    InteractiveCTAContent,
    InteractiveCallRequestContent
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
                const validation = await validateStickerUrl(content.mediaUrl);
                if (!validation.isValid) return { success: false, error: validation.error };
            }

            const payload = this.buildPayload(options);
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
            let activeToken = this.apiToken;
            let effectiveAssetId = this.assetId;

            if (options.credentials) {
                const creds = typeof options.credentials === 'string' ? JSON.parse(options.credentials) : options.credentials;
                activeToken = creds.accessToken || creds.apiToken || creds.access_token || activeToken;
                // If it's a social connection, assetId in credentials might be the page_id
                if (creds.assetId || creds.pageId) effectiveAssetId = creds.assetId || creds.pageId;
            }

            console.log(`[MetaProvider] Sending Social Message to ${options.to} using Asset ${effectiveAssetId}`);

            // Messenger/IG requires Page Access Token
            activeToken = await this.getPageAccessToken(effectiveAssetId, activeToken);

            const content = options.content as any;
            const payload: any = {
                recipient: { id: options.to },
                message: {}
            };

            // Determine if it's text, attachment, or interactive
            const mediaTypes = ['image', 'video', 'audio', 'file', 'sticker'];
            
            if (mediaTypes.includes(content.type) && content.mediaUrl) {
                payload.message.attachment = {
                    type: content.type === 'sticker' ? 'image' : content.type,
                    payload: {
                        url: content.mediaUrl,
                        is_reusable: true
                    }
                };
            } else if (content.type === 'interactive_buttons') {
                const buttonContent = content as InteractiveButtonsContent;
                payload.message.text = buttonContent.body || 'Opciones:';
                payload.message.quick_replies = buttonContent.buttons.slice(0, 13).map(btn => ({
                    content_type: 'text',
                    title: btn.title.substring(0, 20),
                    payload: btn.id
                }));
            } else if (content.type === 'interactive_list') {
                const listContent = content as InteractiveListContent;
                payload.message.text = listContent.body || 'Selecciona una opción:';
                // Flatten list rows into quick replies (max 13 supported by Meta)
                const allRows = listContent.sections.flatMap(s => s.rows).slice(0, 13);
                if (allRows.length > 0) {
                    payload.message.quick_replies = allRows.map(row => ({
                        content_type: 'text',
                        title: row.title.substring(0, 20),
                        payload: row.id
                    }));
                }
            } else if (content.type === 'interactive_cta') {
                const ctaContent = content as InteractiveCTAContent;
                const ctaUrl = ctaContent.buttons[0]?.url || ctaContent.buttons[0]?.phoneNumber || '';
                // Fallback direct URL inside text since IG doesn't support complex CTAs like Messenger
                payload.message.text = `${ctaContent.body || ''}\n\n👉 Enlace: ${ctaUrl}`;
            } else {
                payload.message.text = content.text || ' ';
            }

            if (options.metadata?.features && (options.metadata.features as any).tag) {
                payload.messaging_type = "MESSAGE_TAG";
                payload.tag = (options.metadata.features as any).tag;
            }

            // [LOG] Social Payload
            console.log(`[MetaProvider] Social Payload:`, JSON.stringify(payload));

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
     * Validate incoming webhook from Meta (GET challenge)
     */
    async validateWebhook(request: Request): Promise<WebhookValidationResult> {
        if (request.method === 'GET') {
            const url = new URL(request.url);
            const mode = url.searchParams.get('hub.mode');
            const token = url.searchParams.get('hub.verify_token');
            const challenge = url.searchParams.get('hub.challenge');

            if (mode === 'subscribe' && token === this.verifyToken) {
                console.log('[MetaProvider] Webhook verified successfully');
                return { isValid: true, responseBody: challenge || undefined };
            }
            return { isValid: false, reason: 'Invalid verify token' };
        }

        // POST signatures should ideally be validated via X-Hub-Signature-256
        return { isValid: true };
    }

    /**
     * Maintenance: Ensure an asset is subscribed to webhooks
     * Useful for recovering "failed" connections
     */
    async ensureWebhookSubscription(assetId: string, accessToken: string, type: 'page' | 'whatsapp'): Promise<boolean> {
        try {
            if (type === 'page') {
                const url = `https://graph.facebook.com/v24.0/${assetId}/subscribed_apps`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subscribed_fields: ['messages', 'messaging_postbacks', 'messaging_optins', 'message_deliveries', 'message_reads'] })
                });
                const data = await res.json();
                return data.success === true;
            } else {
                const url = `https://graph.facebook.com/v24.0/${assetId}/subscribed_apps`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messaging_product: 'whatsapp' })
                });
                const data = await res.json();
                return data.success === true;
            }
        } catch (error) {
            console.error('[MetaProvider] Subscription Recovery Failed:', error);
            return false;
        }
    }

    /**
     * Parse Meta Webhook (WhatsApp, Messenger, IG)
     */
    async parseWebhook(payload: any): Promise<(IncomingMessage | IncomingCall)[]> {
        const messages: (IncomingMessage | IncomingCall)[] = [];

        try {
            if (payload.object === 'whatsapp_business_account') {
                const waMessages = await this.parseWhatsAppPayload(payload);
                messages.push(...waMessages);
            } else if (payload.object === 'page' || payload.object === 'instagram') {
                const socialMessages = await this.parseSocialPayload(payload);
                messages.push(...socialMessages);
            }
        } catch (error) {
            console.error('[MetaProvider] parseWebhook Error:', error);
        }

        return messages;
    }

    /**
     * Specialized Parser for WhatsApp Cloud API
     */
    private async parseWhatsAppPayload(payload: any): Promise<(IncomingMessage | IncomingCall)[]> {
        const messages: (IncomingMessage | IncomingCall)[] = [];
        for (const entry of payload.entry || []) {
            for (const change of entry.changes || []) {
                // 1. Handle Messages & Echoes
                const messagesInChange = change.value?.messages || change.value?.smb_message_echoes;
                if (messagesInChange) {
                    for (const msg of messagesInChange) {
                        const contact = change.value.contacts?.find((c: any) => c.wa_id === msg.from);
                        let senderName = contact?.profile?.name || '';
                        
                        let buttonId = undefined;
                        if (msg.type === 'button') {
                            buttonId = msg.button?.payload || msg.button?.text;
                        }

                        const isEcho = change.value.metadata?.phone_number_id === msg.from || msg.is_echo === true;
                        const conversationPartner = isEcho ? (msg.to || change.value.metadata?.display_phone_number) : msg.from;

                        messages.push({
                            id: msg.id,
                            externalId: msg.id,
                            channel: 'whatsapp',
                            from: conversationPartner,
                            senderName: senderName || conversationPartner,
                            buttonId: buttonId,
                            content: {
                                type: msg.type as any,
                                text: msg.text?.body || msg.button?.text || '',
                                mediaUrl: msg.image?.id || msg.video?.id || msg.audio?.id || msg.document?.id,
                                raw: msg
                            },
                            timestamp: new Date(parseInt(msg.timestamp) * 1000),
                            origin: isEcho ? 'outbound' : 'inbound',
                            metadata: {
                                display_phone_number: change.value.metadata?.display_phone_number,
                                phone_number_id: change.value.metadata?.phone_number_id,
                                contactName: senderName,
                                raw: msg
                            }
                        });

                        if (msg.referral) {
                            await this.persistReferralData(msg.from, msg.referral);
                        }
                    }
                }

                // 2. Handle Calls (WebRTC Signaling)
                const callsInChange = change.value?.calls;
                if (callsInChange) {
                    for (const call of callsInChange) {
                        messages.push({
                            type: 'call_signaling',
                            id: call.id,
                            from: call.from,
                            timestamp: new Date(parseInt(call.timestamp) * 1000),
                            call_id: call.id,
                            event: call.event || 'offer',
                            payload: call.payload
                        });
                    }
                }
            }
        }
        return messages;
    }

    /**
     * Specialized Parser for Facebook Messenger & Instagram DM
     */
    private async parseSocialPayload(payload: any): Promise<IncomingMessage[]> {
        const messages: IncomingMessage[] = [];
        const objectType = payload.object; // 'page' or 'instagram'

        for (const entry of payload.entry || []) {
            const pageOrIgId = entry.id;
            const messagingEvents = entry.messaging || entry.standby || [];

            for (const messaging of messagingEvents) {
                    if (messaging.message && !messaging.message.is_echo) {
                        const msg = messaging.message;
                        const channel = objectType === 'page' ? 'messenger' : 'instagram';
                        
                        // DEBUG: Log the whole message object for social channels
                        const rawMsgLog = `[${new Date().toISOString()}] [${channel}] RAW MSG: ${JSON.stringify(msg)}\n`;
                        try { fs.appendFileSync(path.join(process.cwd(), 'debug-inbound.log'), rawMsgLog); } catch (e) {}
                    
                    let senderName = 'Usuario';
                    
                    // Fetch profile if token available
                    if (this.apiToken) {
                        const profile = await this.getSenderProfile(messaging.sender.id, pageOrIgId, this.apiToken, channel as any);
                        if (profile?.name) senderName = profile.name;
                    }

                    // Handle Media Attachments
                    let mediaUrl = undefined;
                    let contentType = 'text';
                    let text = msg.text || '';

                    if (msg.attachments && msg.attachments.length > 0) {
                        const logData = `[${new Date().toISOString()}] [${channel}] Attachments: ${JSON.stringify(msg.attachments)}\n`;
                        try { fs.appendFileSync(path.join(process.cwd(), 'debug-inbound.log'), logData); } catch (e) {}

                        const firstAttachment = msg.attachments[0];
                        mediaUrl = firstAttachment.payload?.url;
                        contentType = firstAttachment.type; // image, video, file, audio
                        
                        // Detect Sticker or Voice
                        if (firstAttachment.payload?.sticker_id) {
                            contentType = 'sticker';
                        }
                        // Instagram sometimes uses 'voice' or 'audio'
                        if (contentType === 'voice') contentType = 'audio';
                    }

                    messages.push({
                        id: msg.mid,
                        externalId: msg.mid,
                        channel: channel as any,
                        from: messaging.sender.id,
                        senderName: senderName,
                        content: {
                            type: contentType as any,
                            text: text,
                            mediaUrl: mediaUrl,
                            raw: messaging
                        },
                        timestamp: new Date(messaging.timestamp),
                        metadata: {
                            page_id: channel === 'messenger' ? pageOrIgId : undefined,
                            instagram_business_id: channel === 'instagram' ? pageOrIgId : undefined,
                            raw: messaging
                        }
                    });
                }
            }
        }
        return messages;
    }

    /**
     * Get Messenger/Instagram Sender Profile
     */
    private async getSenderProfile(psid: string, pageId: string, token: string, channel: 'messenger' | 'instagram'): Promise<{ name?: string; avatar?: string } | null> {
        try {
            const url = `https://graph.facebook.com/v24.0/${psid}?fields=name,first_name,last_name,profile_pic&access_token=${token}`;
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.error) return null;

            return {
                name: data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim(),
                avatar: data.profile_pic
            };
        } catch (e) {
            return null;
        }
    }

    /**
     * Exchange User Token for Page Access Token (Messenger/IG)
     */
    private async getPageAccessToken(pageId: string, userToken: string): Promise<string> {
        try {
            const url = `https://graph.facebook.com/v24.0/${pageId}?fields=access_token&access_token=${userToken}`;
            const res = await fetch(url);
            const data = await res.json();
            return data.access_token || userToken;
        } catch (e) {
            return userToken;
        }
    }

    /**
     * Helper to build Axios/Fetch payload for Meta API
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
                    components: content.templateComponents || []
                };
                if (content.time_to_live) {
                    (payload.template as any).time_to_live = content.time_to_live;
                }
                break;

            case 'image':
                payload.type = 'image';
                if (content.mediaId) {
                    payload.image = { id: content.mediaId, caption: content.caption };
                } else {
                    payload.image = { link: content.mediaUrl, caption: content.caption };
                }
                break;

            case 'video':
                payload.type = 'video';
                if (content.mediaId) {
                    payload.video = { id: content.mediaId, caption: content.caption };
                } else {
                    payload.video = { link: content.mediaUrl, caption: content.caption };
                }
                break;

            case 'audio':
                payload.type = 'audio';
                if (content.mediaId) {
                    payload.audio = { id: content.mediaId };
                } else {
                    payload.audio = { link: content.mediaUrl };
                }
                break;

            case 'document':
                payload.type = 'document';
                if (content.mediaId) {
                    payload.document = { id: content.mediaId, caption: content.caption, filename: content.filename };
                } else {
                    payload.document = { link: content.mediaUrl, caption: content.caption, filename: content.filename };
                }
                break;

            case 'sticker':
                payload.type = 'sticker';
                if (content.mediaId) {
                    payload.sticker = { id: content.mediaId };
                } else {
                    payload.sticker = { link: content.mediaUrl };
                }
                break;

            case 'interactive_buttons': {
                const buttonContent = content as InteractiveButtonsContent;
                payload.type = 'interactive';
                payload.interactive = {
                    type: 'button',
                    body: { text: buttonContent.body },
                    action: {
                        buttons: buttonContent.buttons.slice(0, 3).map(btn => ({
                            type: 'reply',
                            reply: {
                                id: btn.id,
                                title: btn.title.substring(0, 20)
                            }
                        }))
                    }
                };
                if (buttonContent.header) {
                    if (buttonContent.header.type === 'text') {
                        payload.interactive.header = { type: 'text', text: buttonContent.header.text };
                    } else if (buttonContent.header.mediaUrl) {
                        payload.interactive.header = {
                            type: buttonContent.header.type,
                            [buttonContent.header.type]: { link: buttonContent.header.mediaUrl }
                        };
                    }
                }
                if (buttonContent.footer) {
                    payload.interactive.footer = { text: buttonContent.footer };
                }
                break;
            }

            case 'interactive_list': {
                const listContent = content as InteractiveListContent;
                payload.type = 'interactive';
                payload.interactive = {
                    type: 'list',
                    body: { text: listContent.body },
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
                            display_text: ctaContent.buttons[0]?.text || 'Ver más',
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
                if (ctaContent.footer) {
                    payload.interactive.footer = { text: ctaContent.footer };
                }
                break;
            }

            case 'location_request':
                payload.type = 'interactive';
                payload.interactive = {
                    type: 'location_request_message',
                    body: { text: content.body },
                    action: { name: 'send_location' }
                };
                break;

            default:
                payload.type = 'text';
                payload.text = { body: 'Mensaje no soportado' };
        }

        return payload;
    }

    /**
     * Upload media to Meta to get a media_id
     */
    private async uploadMedia(mediaUrl: string, token: string, type: string = 'audio', overrideAssetId?: string): Promise<string | null> {
        try {
            const effectiveAssetId = overrideAssetId || this.assetId;
            // 1. Download from Supabase
            const fileRes = await fetch(mediaUrl);
            if (!fileRes.ok) throw new Error(`Failed to fetch media from URL: ${fileRes.statusText}`);
            const blob = await fileRes.blob();

            // 2. Upload to Meta
            const uploadUrl = `https://graph.facebook.com/v24.0/${effectiveAssetId}/media`;
            const formData = new FormData();
            
            // Map types for Meta
            // WhatsApp Types: image, video, audio, document, sticker
            let metaType = type;
            if (type === 'sticker') metaType = 'image'; // Stickers are uploaded as images to Meta's media endpoint

            let fileName = `file-${Date.now()}`;
            if (type === 'audio') fileName = 'recording.ogg';
            else if (type === 'sticker') fileName = 'sticker.webp';
            else if (type === 'image') fileName = 'image.jpg';

            const file = new File([blob], fileName, { type: blob.type });
            
            formData.append('file', file);
            formData.append('type', metaType);
            formData.append('messaging_product', 'whatsapp');

            const metaRes = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const metaData = await metaRes.json();
            if (!metaRes.ok) {
                console.error('[MetaProvider] Upload Error Details:', JSON.stringify(metaData, null, 2));
                return null;
            }

            return metaData.id;
        } catch (error: any) {
            console.error('[MetaProvider] uploadMedia Exception:', error.message);
            return null;
        }
    }

    /**
     * Helper to persist referral data (CTWA) to the database
     */
    private async persistReferralData(userPhone: string, data: any) {
        try {
            const { data: lead } = await supabaseAdmin
                .from('leads') 
                .select('id, metadata')
                .eq('phone', userPhone)
                .single();

            if (lead) {
                const newMeta = { ...lead.metadata, ...data };
                await supabaseAdmin
                    .from('leads')
                    .update({ metadata: newMeta })
                    .eq('id', lead.id);
                return;
            }

            const { data: conv } = await supabaseAdmin
                .from('conversations')
                .select('id, metadata')
                .eq('channel_type', 'whatsapp')
                .ilike('metadata->>display_phone_number', `%${userPhone}%`)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (conv) {
                const newMeta = { ...conv.metadata, ...data };
                await supabaseAdmin
                    .from('conversations')
                    .update({ metadata: newMeta })
                    .eq('id', conv.id);
            }

        } catch (error: any) {
            console.error('[MetaProvider] persistReferralData error:', error);
        }
    }
}
