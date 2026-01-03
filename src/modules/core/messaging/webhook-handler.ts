import { createClient } from "@/lib/supabase-server"
import { ChannelType, MessageContentType } from "@/types/messaging"
import { WorkflowEngine, WorkflowDefinition } from "@/modules/core/automation/engine"
import { MessagingProvider, IncomingMessage } from "./providers/types"
import { inboxService } from "./inbox-service"

export class WebhookManager {
    private providers: Record<string, MessagingProvider> = {}
    private static instance: WebhookManager;

    private constructor() { }

    static getInstance(): WebhookManager {
        if (!WebhookManager.instance) {
            WebhookManager.instance = new WebhookManager();
        }
        return WebhookManager.instance;
    }

    /**
     * Register a provider for a specific channel
     */
    registerProvider(channel: ChannelType, provider: MessagingProvider) {
        this.providers[channel] = provider
        console.log(`[WebhookManager] Registered provider '${provider.name}' for channel '${channel}'`)
    }

    /**
     * Handle incoming webhook request
     */
    async handle(channel: ChannelType, request: Request): Promise<{ success: boolean, message?: string }> {
        const provider = this.providers[channel]

        if (!provider) {
            // If no provider registered, fallback to legacy handling (if any) or error
            console.warn(`[WebhookManager] No provider found for channel ${channel}`)
            return { success: false, message: `No provider for channel ${channel}` }
        }

        try {
            // 1. Validate Request Signature
            const validation = await provider.validateWebhook(request)
            if (!validation.isValid) {
                console.warn(`[WebhookManager] Invalid signature for ${channel}: ${validation.reason}`)
                return { success: false, message: validation.reason || "Invalid signature" }
            }

            // GET requests are usually verification challenges (Meta)
            if (request.method === 'GET') {
                // If the provider returned a specific body (like hub.challenge), pass it back
                return { success: true, message: validation.responseBody || "Verified" }
            }

            // 2. Parse Payload
            // Clone request to avoid consuming body stream if provider reads it
            const payload = await request.json()
            const messages = await provider.parseWebhook(payload)

            if (messages.length === 0) {
                return { success: true, message: "No messages to process" }
            }

            // 3. Process Normalized Messages
            for (const msg of messages) {
                await this.processMessage(msg)
            }

            return { success: true }
        } catch (error) {
            console.error(`[WebhookManager] Error handling ${channel} webhook:`, error)
            return { success: false, message: "Internal processing error" }
        }
    }

    /**
     * Handle webhook with pre-parsed body (avoids body consumption issue)
     */
    async handleParsed(channel: ChannelType, payload: any): Promise<{ success: boolean; message?: string }> {
        const provider = this.providers[channel]
        if (!provider) {
            console.warn(`[WebhookManager] No provider registered for channel: ${channel}`)
            return { success: false, message: `No provider for ${channel}` }
        }

        try {
            console.log('[WebhookManager] Processing webhook for channel:', channel)

            // Parse messages from payload
            const messages = await provider.parseWebhook(payload)
            console.log('[WebhookManager] Parsed messages:', messages.length)

            if (messages.length === 0) {
                return { success: true, message: "No messages to process" }
            }

            // Process all messages
            for (const msg of messages) {
                await this.processMessage(msg)
            }

            return { success: true }
        } catch (error) {
            console.error(`[WebhookManager] Error in handleParsed:`, error)
            return { success: false, message: "Internal processing error" }
        }
    }

    private async processMessage(msg: IncomingMessage) {
        console.log(`[WebhookManager] Processing Inbound Message from ${msg.from} on ${msg.channel}`)

        // 1. SAVE TO INBOX
        const result = await inboxService.handleIncomingMessage(msg)

        if (!result || !result.success || !result.conversationId) {
            console.error('[WebhookManager] Failed to save message to inbox')
            return
        }

        const conversationId = result.conversationId

        // 2. AUTO ASSIGNMENT
        // Import dynamically to avoid circular dependencies if any (though assignment-engine is "use server")
        try {
            const { assignConversation } = await import('./assignment-engine')
            await assignConversation(conversationId)
        } catch (assignError) {
            console.error('[WebhookManager] Failed to run auto-assignment:', assignError)
        }

        // 3. Find or Create Lead associated with this phone number (now handled by inboxService, but we check for workflows)
        const supabase = await createClient()

        // 4. Trigger Automation Workflows
        const { data: workflows, error } = await supabase
            .from('workflows')
            .select('*')
            .eq('is_active', true)
            .eq('trigger_type', 'webhook')

        if (error || !workflows || workflows.length === 0) {
            console.log("[WebhookManager] No active webhook workflows found")
            return
        }

        console.log(`[WebhookManager] Found ${workflows.length} active workflows candidates`)

        for (const wf of workflows) {
            try {
                // Check channel config match
                const config = wf.trigger_config as Record<string, unknown>

                // If workflow is specific to a channel, check match
                if (config?.channel && config.channel !== msg.channel) {
                    continue
                }

                // If workflow is specific to a keyword (optional)
                if (config?.keyword && msg.content.type === 'text') {
                    const keyword = (config.keyword as string).toLowerCase()
                    const text = (msg.content.text || '').toLowerCase()
                    if (!text.includes(keyword)) continue
                }

                console.log(`[WebhookManager] Starting workflow ${wf.name} (${wf.id})`)
                const definition = wf.definition as WorkflowDefinition

                // Initialize Engine with Context
                const context = {
                    message: {
                        id: msg.id,
                        text: msg.content.text,
                        mediaUrl: msg.content.mediaUrl,
                        sender: msg.from,
                        channel: msg.channel,
                        timestamp: msg.timestamp,
                        conversationId: conversationId // Add context
                    },
                    lead: {
                        phone: msg.from,
                        name: msg.senderName || "Unknown"
                    }
                }

                const engine = new WorkflowEngine(definition, context)
                await engine.start()

            } catch (err) {
                console.error(`[WebhookManager] Failed to run workflow ${wf.id}:`, err)
            }
        }
    }
}

// Export singleton
export const webhookManager = WebhookManager.getInstance()
