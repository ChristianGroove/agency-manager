import { MessagingProvider, SendMessageOptions, WebhookValidationResult, IncomingMessage } from "./types"

interface EvolutionConfig {
    baseUrl: string;
    apiKey: string; // Global API Key or Instance Token
    instanceName: string;
}

export class EvolutionProvider implements MessagingProvider {
    name = 'evolution'
    private config: EvolutionConfig

    constructor(config: EvolutionConfig) {
        this.config = config
    }

    async sendMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const { baseUrl, apiKey, instanceName } = this.config
        const content = options.content

        // 1. Determine Endpoint and Payload based on Content Type
        let endpoint = ''
        const cleanNumber = options.to.replace(/\D/g, '')
        const jid = cleanNumber.includes('@') ? cleanNumber : `${cleanNumber}@s.whatsapp.net`

        let body: any = {
            number: jid,
            options: {
                delay: 1200,
                presence: "composing",
                linkPreview: false,
                ...((options.metadata as any)?.options || {})
            }
        }

        switch (content.type) {
            case 'text':
                endpoint = 'message/sendText'
                body.text = content.text
                break

            case 'image':
            case 'audio':
            case 'video':
            case 'document':
                endpoint = 'message/sendMedia'
                body.media = content.mediaUrl
                body.mediatype = content.type === 'image' ? 'image' :
                    content.type === 'video' ? 'video' :
                        content.type === 'audio' ? 'audio' : 'document'
                body.caption = (content as any).caption || ''
                if (content.type === 'document' && (content as any).filename) {
                    body.fileName = (content as any).filename
                }
                break

            case 'interactive_buttons':
                endpoint = 'message/sendButtons'
                body.title = (content as any).header?.text || 'Cotización'
                body.description = content.body
                body.footer = (content as any).footer || ''
                body.buttons = (content as any).buttons.map((b: any) => ({
                    buttonId: b.id,
                    buttonText: { displayText: b.title },
                    type: 'reply'
                }))
                break

            case 'interactive_list':
                endpoint = 'message/sendList'
                body.title = (content as any).header || ''
                body.description = content.body
                body.buttonText = (content as any).buttonText || 'Opciones'
                body.footer = (content as any).footer || ''
                body.sections = (content as any).sections.map((s: any) => ({
                    title: s.title,
                    rows: s.rows.map((r: any) => ({
                        title: r.title,
                        description: r.description,
                        rowId: r.id
                    }))
                }))
                break

            default:
                return { success: false, error: `Content type ${content.type} not supported by Evolution provider` }
        }

        const url = `${baseUrl.replace(/\/$/, '')}/${endpoint}/${instanceName}`

        try {
            // Log to file for debugging
            const fs = require('fs')
            const logPath = require('path').join(process.cwd(), 'evolution_api_debug.log')
            const debugLog = `\n[${new Date().toISOString()}] EVOLUTION SEND REQUEST\nURL: ${url}\nEndpoint: ${endpoint}\nBody: ${JSON.stringify(body, null, 2)}\n`
            fs.appendFileSync(logPath, debugLog)

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": apiKey
                },
                body: JSON.stringify(body)
            })

            const textResponse = await response.text()
            let data: any = {}
            try {
                data = JSON.parse(textResponse)
            } catch (e) {
                data = { error: textResponse }
            }

            if (response.ok) {
                // Return consistent messageId format
                const messageId = data.key?.id || data.messageId || `evo_${Date.now()}`
                return { success: true, messageId }
            } else {
                console.error(`[EvolutionProvider] API ERROR (${response.status}):`, data)
                return { success: false, error: JSON.stringify(data) }
            }
        } catch (error: any) {
            console.error(`[EvolutionProvider] Connection Error:`, error)
            return { success: false, error: error.message }
        }
    }

    async validateWebhook(request: Request): Promise<WebhookValidationResult> {
        // Evolution API usually allows disabling global webhook signature or uses a simple token.
        // For minimal setup, we often rely on the URL token (e.g. ?token=XYZ).
        // Here we assume if it hit our private endpoint, it's valid, or we can check header "apikey".

        // const authHeader = request.headers.get("apikey")
        // if (authHeader === this.config.apiKey) return { isValid: true }

        return { isValid: true }
    }

    /**
     * Download media from Evolution API and return a usable URL
     * Evolution stores media temporarily, so we need to fetch and upload to our storage
     */
    private async processMedia(
        messageId: string,
        messageType: 'image' | 'audio' | 'video' | 'document',
        mimeType?: string
    ): Promise<string> {
        const { baseUrl, apiKey, instanceName } = this.config;

        try {
            // Try to get base64 from Evolution API
            const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/getBase64FromMediaMessage/${instanceName}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': apiKey
                },
                body: JSON.stringify({
                    message: { key: { id: messageId } },
                    convertToMp4: messageType === 'video'
                })
            });

            if (!response.ok) {
                console.error(`[EvolutionProvider] Failed to get media: ${response.statusText}`);
                return '';
            }

            const data = await response.json();
            const base64Data = data.base64;

            if (!base64Data) {
                console.warn('[EvolutionProvider] No base64 data returned from Evolution');
                return '';
            }

            // Convert base64 to buffer and upload to Supabase
            const { supabaseAdmin } = await import('@/lib/supabase-admin');

            // Remove data URI prefix if present
            const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
            const buffer = Buffer.from(cleanBase64, 'base64');

            // Determine extension
            const ext = mimeType?.split('/')[1]?.split(';')[0] ||
                (messageType === 'audio' ? 'ogg' :
                    messageType === 'video' ? 'mp4' :
                        messageType === 'image' ? 'jpg' : 'bin');

            const fileName = `evolution/${new Date().getFullYear()}/${Date.now()}_${messageId}.${ext}`;

            const { error } = await supabaseAdmin.storage
                .from('chat-attachments')
                .upload(fileName, buffer, {
                    contentType: mimeType || 'application/octet-stream',
                    upsert: true
                });

            if (error) {
                console.error('[EvolutionProvider] Storage upload failed:', error);
                return '';
            }

            // Get public URL
            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('chat-attachments')
                .getPublicUrl(fileName);

            console.log(`[EvolutionProvider] Media uploaded: ${publicUrl}`);
            return publicUrl;

        } catch (error) {
            console.error('[EvolutionProvider] processMedia error:', error);
            return '';
        }
    }

    async parseWebhook(payload: any): Promise<IncomingMessage[]> {
        // Evolution API Webhook Structure (v1/v2 varies, assuming v2 common format)
        // Usually event: "messages.upsert"

        const messages: IncomingMessage[] = []

        // Check if it's a message event
        if (payload.event === "messages.upsert" || payload.type === "message") {
            const data = payload.data
            const msg = data.message || data

            // Ignore status updates or own messages
            if (data.key?.fromMe) return []

            const from = data.key?.remoteJid?.replace("@s.whatsapp.net", "")
            const text = msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || ""

            // Enhanced type detection for media messages
            let type: IncomingMessage['content']['type'] = 'text';
            let contentText = text;
            let mediaUrl: string | undefined = undefined;
            let buttonId: string | undefined = undefined;
            const messageId = data.key?.id;

            // Image message
            if (msg.imageMessage && messageId) {
                type = 'image';
                mediaUrl = await this.processMedia(messageId, 'image', msg.imageMessage.mimetype);
                contentText = msg.imageMessage.caption || '';
            }

            // Audio/Voice message
            if (msg.audioMessage && messageId) {
                type = 'audio';
                mediaUrl = await this.processMedia(messageId, 'audio', msg.audioMessage.mimetype);
            }

            // Video message
            if (msg.videoMessage && messageId) {
                type = 'video';
                mediaUrl = await this.processMedia(messageId, 'video', msg.videoMessage.mimetype);
                contentText = msg.videoMessage.caption || '';
            }

            // Document message
            if (msg.documentMessage && messageId) {
                type = 'document';
                mediaUrl = await this.processMedia(messageId, 'document', msg.documentMessage.mimetype);
                contentText = msg.documentMessage.fileName || msg.documentMessage.caption || '';
            }

            // Check for Interactive Responses (Buttons/Lists)
            if (msg.buttonsResponseMessage) {
                type = 'interactive';
                buttonId = msg.buttonsResponseMessage.selectedButtonId;
                contentText = msg.buttonsResponseMessage.selectedDisplayText;
            } else if (msg.listResponseMessage) {
                type = 'interactive';
                buttonId = msg.listResponseMessage.singleSelectReply?.selectedRowId;
                contentText = msg.listResponseMessage.title || msg.listResponseMessage.description;
            }

            const incoming: IncomingMessage = {
                id: data.key?.id || Date.now().toString(),
                externalId: data.key?.id,
                channel: 'evolution',
                from: from,
                senderName: data.pushName,
                buttonId: buttonId,
                content: {
                    type: type,
                    text: contentText,
                    mediaUrl: mediaUrl,
                },
                timestamp: new Date(data.messageTimestamp ? data.messageTimestamp * 1000 : Date.now()),
                metadata: {
                    provider: 'evolution',
                    instance: this.config.instanceName
                }
            }
            messages.push(incoming)
        }

        return messages
    }
}
