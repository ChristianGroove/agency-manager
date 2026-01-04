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

        // Normalize endpoint (trim slashes)
        const url = `${baseUrl.replace(/\/$/, '')}/message/sendText/${instanceName}`

        const body = {
            number: options.to,
            options: {
                delay: 1200,
                presence: "composing",
                linkPreview: false
            },
            textMessage: {
                text: options.content.text
            }
        }

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": apiKey
                },
                body: JSON.stringify(body)
            })

            const data = await response.json()

            if (response.ok) {
                return { success: true, messageId: data.key?.id } // Evolution usually returns key.id
            } else {
                return { success: false, error: JSON.stringify(data) }
            }
        } catch (error: any) {
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

            // Basic parsing
            const incoming: IncomingMessage = {
                id: data.key?.id || Date.now().toString(),
                externalId: data.key?.id,
                channel: 'evolution',
                from: from,
                senderName: data.pushName,
                content: {
                    type: msg.imageMessage ? 'image' : 'text',
                    text: text,
                    // mediaUrl: ... (extracting media from Evolution requires fetching media Url separately usually)
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
