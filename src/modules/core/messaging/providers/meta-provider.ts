import * as fs from 'fs';
import * as path from 'path';
import { supabaseAdmin } from "@/lib/supabase-admin"
import { decryptObject } from "@/modules/core/integrations/encryption"
import { validateStickerUrl } from "@/lib/meta/sticker-validator"

function debugLog(msg: string) {
    try {
        const logPath = path.join(process.cwd(), 'debug.log');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}][MetaProvider] ${msg} \n`);
    } catch (e) { }
}
import {
    MessagingProvider,
    SendMessageOptions,
    IncomingMessage,
    WebhookValidationResult,
    IncomingCall,
    InteractiveButtonsContent,
    InteractiveListContent,
    InteractiveCTAContent
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

            // Strict Validation for Stickers
            if (options.content.type === 'sticker') {
                const validation = await validateStickerUrl(options.content.mediaUrl);
                if (!validation.isValid) {
                    console.error('[MetaProvider] Sticker Validation Failed:', validation.error);
                    return {
                        success: false,
                        error: validation.error
                    };
                }
            }

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
    async parseWebhook(payload: any): Promise<(IncomingMessage | IncomingCall)[]> {
        const messages: (IncomingMessage | IncomingCall)[] = [];

        try {
            if (payload.object === 'whatsapp_business_account') {
                for (const entry of payload.entry || []) {
                    debugLog(`Processing WA entry: ${entry.id}`);
                    for (const change of entry.changes || []) {
                        debugLog(`Change field: ${change.field}`);

                        // 1. Handle Messages & Echoes
                        const messagesInChange = change.value?.messages || change.value?.smb_message_echoes;
                        if (messagesInChange) {
                            debugLog(`Found ${messagesInChange.length} WA messages/echoes`);
                            for (const msg of messagesInChange) {
                                debugLog(`Processing WA msg: ${msg.id} Type: ${msg.type}`);
                                debugLog(`[DEBUG] Full Message Object: ${JSON.stringify(msg, null, 2)}`);
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

                                // Detect Echo (Outbound Message from App or SMB)
                                const isEcho = change.value.metadata?.phone_number_id === msg.from || msg.is_echo === true;
                                const origin = isEcho ? 'outbound' : 'inbound';
                                const conversationPartner = isEcho ? (msg.to || change.value.metadata?.display_phone_number) : msg.from;

                                if (isEcho) {
                                    debugLog(`[MetaProvider] Detected ECHO/SMB from ${msg.from} to ${msg.to || 'Unknown'}`);
                                }

                                messages.push({
                                    id: msg.id,
                                    externalId: msg.id,
                                    channel: 'whatsapp',
                                    from: conversationPartner, // Usage of 'from' here implies "Conversation Identifier"
                                    origin: origin,
                                    senderName: contact?.profile?.name || 'Unknown',
                                    timestamp: new Date(parseInt(msg.timestamp) * 1000),
                                    content: content,
                                    buttonId: buttonId, // Populate buttonId
                                    metadata: {
                                        phoneNumberId: change.value.metadata?.phone_number_id,
                                        displayPhoneNumber: change.value.metadata?.display_phone_number,
                                        isEcho: isEcho
                                    },
                                    referral: msg.referral ? {
                                        source_type: msg.referral.source_type,
                                        source_id: msg.referral.source_id,
                                        source_url: msg.referral.source_url,
                                        ctwa_clid: msg.referral.ctwa_clid
                                    } : undefined
                                });

                                // 3.1 Handle Referrals (Ads/CTWA) - PERSISTENCE
                                if (msg.referral) {
                                    console.log('[MetaProvider] 🟢 Referral/CTWA detected:', msg.referral);

                                    // Calculate 72h free window
                                    const now = new Date();
                                    const freeWindowExpiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours

                                    // We need to identify the conversation to update it
                                    // The 'from' field in this context is the user's phone number (conversation identifier)
                                    const userPhone = msg.from;

                                    // We need to find the conversation or lead associated with this phone number
                                    // Since this is inside the loop, we might not have the conversation ID handy yet without a DB lookup.
                                    // However, we can fire-and-forget an update based on the phone number.

                                    this.persistReferralData(userPhone, {
                                        referral_source: msg.referral.source_type,
                                        referral_id: msg.referral.source_id,
                                        ctwa_clid: msg.referral.ctwa_clid,
                                        referral_headline: msg.referral.headline,
                                        free_window_expires_at: freeWindowExpiresAt.toISOString()
                                    }).catch(err => console.error('[MetaProvider] Failed to persist referral data:', err));
                                }
                            }
                        }

                        // 2. Handle Calls (WebRTC Signaling)
                        const callsInChange = change.value?.calls;
                        if (callsInChange) {
                            debugLog(`Found ${callsInChange.length} WA calls`);
                            for (const call of callsInChange) {
                                debugLog(`Processing WA call: ${call.id}`);
                                messages.push({
                                    type: 'call_signaling',
                                    id: call.id,
                                    from: call.from,
                                    timestamp: new Date(parseInt(call.timestamp) * 1000),
                                    call_id: call.call_id || call.id,
                                    event: call.data?.event || 'offer', // Default to offer if parsing simplistically
                                    payload: call.data?.payload, // SDP
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
                            let senderAvatar = undefined;

                            // Resolve Token: Use global apiToken or fetch from DB (Tenant aware)
                            let effectiveToken = this.apiToken;
                            if (!effectiveToken) {
                                effectiveToken = await this.getTokenByAssetId(pageOrIgId);
                            }

                            if (effectiveToken) {
                                debugLog('Fetching sender profile...');
                                const profile = await this.getSenderProfile(messaging.sender.id, pageOrIgId, effectiveToken, channel as any);
                                if (profile) {
                                    if (profile.name) senderName = profile.name;
                                    if (profile.picture) senderAvatar = profile.picture;
                                }
                            }

                            debugLog(`Pushing message from ${senderName} (${channel})`);
                            messages.push({
                                id: msg.mid,
                                externalId: msg.mid,
                                channel: channel as any,
                                from: messaging.sender.id,
                                senderName: senderName,
                                senderAvatarUrl: senderAvatar,
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
     * Send WebRTC Signaling Message (SDP Answer)
     */
    async sendSignalingMessage(to: string, sdp: string, callId: string): Promise<boolean> {
        try {
            // Use the standard messages endpoint but with 'peer_to_peer_signal' or similar type?
            // Actually, for Calling API, we typically reply to the call_id logic.
            // Assuming usage of /messages with specific payload for now.

            // NOTE: This payload is hypothetical based on standard patterns as Calling API specs vary.
            // We will refine this once we have the exact spec confirmation.
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'text', // Placeholder: Signaling usually travels via specialized message type or separate endpoint
                text: {
                    body: JSON.stringify({ type: 'sdp_answer', sdp, call_id: callId })
                }
                // In a real implementation with known spec, we would use:
                // type: 'signal', signal: { ... }
            };

            // Using standard sendMessage logic for transport
            const res = await this.sendMessage({
                to,
                content: { type: 'text', text: payload.text.body }
            });

            return res.success;
        } catch (e) {
            console.error('[MetaProvider] Failed to send signaling:', e);
            return false;
        }
    }

    /**
     * Helper to get FB/IG User Profile (Name/Picture)
     */
    private async getSenderProfile(psid: string, assetId: string, userToken: string, channel?: 'messenger' | 'instagram') {
        try {
            const pageToken = await this.getPageAccessToken(assetId, userToken);

            // IG Users don't have first_name/last_name, just 'name'
            const fields = channel === 'instagram'
                ? 'name,profile_pic'
                : 'first_name,last_name,profile_pic';

            const url = `https://graph.facebook.com/v24.0/${psid}?fields=${fields}&access_token=${pageToken}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.name || data.first_name) {
                return {
                    name: data.name || `${data.first_name} ${data.last_name || ''}`.trim(),
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
        try {
            const { data: connections, error } = await supabaseAdmin
                .from('integration_connections')
                .select('credentials, provider_key, metadata')
                .in('provider_key', ['meta_whatsapp', 'meta_business', 'whatsapp_cloud', 'facebook_page', 'instagram_dm'])
                .eq('status', 'active');

            if (error) {
                console.error('[MetaProvider] DB query error:', error);
                return '';
            }

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
                        return creds.access_token || creds.accessToken || '';
                    }
                }

                // STRATEGY 2: WhatsApp Cloud / Legacy
                const storedId = conn.metadata?.asset_id || conn.metadata?.phone_number_id || creds.phoneNumberId || creds.phone_number_id;

                if (String(storedId) === String(assetId)) {
                    return creds.access_token || creds.accessToken || creds.apiToken || '';
                }
            }
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
        console.log(`[MetaProvider] Parsing message of type: ${msg.type}`);
        if (msg.type === 'text') {
            return {
                type: 'text',
                text: msg.text?.body || '',
                raw: msg.text
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

        if (msg.type === 'sticker') {
            const mediaId = msg.sticker.id;
            // Stickers are always webp
            const publicUrl = await this.processMedia(mediaId, msg.sticker.mime_type || 'image/webp', phoneNumberId);

            return {
                type: 'sticker',
                mediaUrl: publicUrl,
                text: '[Sticker]',
                raw: msg.sticker
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

        if (msg.errors && msg.errors.length > 0) {
            const error = msg.errors[0];
            return {
                type: 'text',
                text: `[Error: ${error.message || error.details || 'Message unavailable'}]`,
                raw: msg
            } as any;
        }

        return {
            type: 'unknown',
            text: msg.type === 'unknown' ? '[Unsupported/Unavailable]' : '',
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
                    components: content.templateComponents || []
                };
                // Support for Authentication/Utility templates with TTL or ROI tracking via opaque data
                if (content.time_to_live) {
                    (payload.template as any).time_to_live = content.time_to_live;
                }
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

            case 'sticker':
                payload.type = 'sticker';
                payload.sticker = {
                    link: content.mediaUrl
                };
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
                                title: btn.title.substring(0, 20)  // Max 20 chars
                            }
                        }))
                    }
                };
                // Optional header
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
                // Optional footer
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
                console.warn('[MetaProvider] Unknown message type:', (content as any).type);
                payload.type = 'text';
                payload.text = { body: 'Mensaje no soportado' };
        }

        return payload;
    }

    /**
     * Helper to persist referral data (CTWA) to the database
     */
    private async persistReferralData(userPhone: string, data: any) {
        try {
            // Find the most recent conversation or lead for this phone number
            // Strategy: Search leads first as it's the primary entity
            const { data: lead } = await supabaseAdmin
                .from('leads') // leads table
                .select('id, metadata')
                .eq('phone', userPhone)
                .single();

            if (lead) {
                const newMeta = { ...lead.metadata, ...data };
                await supabaseAdmin
                    .from('leads')
                    .update({ metadata: newMeta })
                    .eq('id', lead.id);
                console.log(`[MetaProvider] Updated Lead ${lead.id} with referral data`);
                return;
            }

            // If no lead, try finding a conversation directly
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
                console.log(`[MetaProvider] Updated Conversation ${conv.id} with referral data`);
            }

        } catch (error: any) {
            console.error('[MetaProvider] persistReferralData error:', error);
        }
    }
}

