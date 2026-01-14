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
        } catch (error: any) {
            const errorMsg = error?.message || String(error)
            console.error(`[WebhookManager] Error in handleParsed:`, errorMsg, error?.stack)
            return { success: false, message: `Internal processing error: ${errorMsg}` }
        }
    }

    private async processMessage(msg: IncomingMessage) {


        // 1. SAVE TO INBOX
        const result = await inboxService.handleIncomingMessage(msg)

        if (!result || !result.success || !result.conversationId) {
            console.error('[WebhookManager] Failed to save message to inbox')
            return
        }

        const conversationId = result.conversationId

        // 1.5 CHECK FOR INTERACTIVE QUOTE RESPONSES
        // MetaProvider extracts buttonId directly from interactive messages
        const buttonId = msg.buttonId || ''

        if (buttonId) {


            // Handle Quote Approval
            if (buttonId.startsWith('approve_cart_')) {
                const cartId = buttonId.replace('approve_cart_', '')


                try {
                    const { handleQuoteApproval } = await import('@/modules/core/crm/quote-response-handler')
                    const { data: conv } = await (await import('@/lib/supabase-admin')).supabaseAdmin
                        .from('conversations')
                        .select('connection_id, phone')
                        .eq('id', conversationId)
                        .single()

                    await handleQuoteApproval({
                        conversationId,
                        cartId,
                        connectionId: conv?.connection_id || '',
                        recipientPhone: msg.from
                    })
                } catch (e: any) {
                    console.error('[WebhookManager] Quote approval error:', e.message)
                }
                return // Stop further processing
            }

            // Handle Quote Rejection - Show reason list
            if (buttonId.startsWith('reject_cart_')) {
                const cartId = buttonId.replace('reject_cart_', '')


                try {
                    const { handleQuoteRejection } = await import('@/modules/core/crm/quote-response-handler')
                    const { supabaseAdmin } = await import('@/lib/supabase-admin')
                    const { data: conv } = await supabaseAdmin
                        .from('conversations')
                        .select('connection_id, phone')
                        .eq('id', conversationId)
                        .single()

                    await handleQuoteRejection({
                        conversationId,
                        cartId,
                        connectionId: conv?.connection_id || '',
                        recipientPhone: msg.from
                    })
                } catch (e: any) {
                    console.error('[WebhookManager] Quote rejection error:', e.message)
                }
                return // Stop further processing
            }

            // Handle Rejection Reason Selection (from list response)
            // buttonId also catches list_reply.id from MetaProvider
            if (buttonId.startsWith('rejection_reason_')) {
                // Format: rejection_reason_{cartId}_{index}
                const parts = buttonId.replace('rejection_reason_', '').split('_')
                const cartId = parts.slice(0, -1).join('_') // Handle UUIDs with dashes
                const reason = msg.content.text || 'Unknown'



                try {
                    const { handleRejectionReasonSelected } = await import('@/modules/core/crm/quote-response-handler')
                    await handleRejectionReasonSelected(cartId, reason, conversationId)
                } catch (e: any) {
                    console.error('[WebhookManager] Rejection reason error:', e.message)
                }
                return // Stop further processing
            }
        }

        // 2. CHECK SUSPENDED WORKFLOWS (Pending Inputs)
        // Use Admin client because Webhooks are unauthenticated system events
        const { supabaseAdmin } = await import('@/lib/supabase-admin')
        const supabase = supabaseAdmin

        // Find active pending input for this conversation
        const { data: pendingInput } = await supabase
            .from('workflow_pending_inputs')
            .select('*')
            .eq('conversation_id', conversationId)
            .eq('status', 'waiting')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (pendingInput) {
            console.log(`[WebhookManager] Found pending input for conversation ${conversationId}`)
            const { resumeSuspendedWorkflow } = await import('@/modules/core/automation/runner')

            // Resume
            const result = await resumeSuspendedWorkflow(pendingInput.execution_id, pendingInput.id, msg)

            if (result.success) {
                console.log(`[WebhookManager] Workflow resumed successfully. Stopping further processing.`)
                return // STOP HERE
            }
            // If resume failed (e.g. validation error), we proceed to possibly trigger other workflows or assignment
        }

        // 3. AUTO ASSIGNMENT
        // Import dynamically to avoid circular dependencies if any (though assignment-engine is "use server")
        try {
            const { assignConversation } = await import('./assignment-engine')
            await assignConversation(conversationId)
        } catch (assignError) {
            console.error('[WebhookManager] Failed to run auto-assignment:', assignError)
        }

        // 4. Find or Create Lead associated with this phone number (now handled by inboxService, but we check for workflows)
        // (Supabase admin already imported above)

        // 5. Trigger Automation Workflows
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


            // Initialize Context
            const context = {
                message: {
                    id: msg.id,
                    text: msg.content.text,
                    mediaUrl: msg.content.mediaUrl,
                    sender: msg.from,
                    channel: msg.channel,
                    timestamp: msg.timestamp,
                    conversationId: conversationId
                },
                lead: {
                    phone: msg.from,
                    name: msg.senderName || "Unknown"
                }
            }

            // Create Execution Record
            const { data: execution, error: execError } = await supabase
                .from('workflow_executions')
                .insert({
                    organization_id: wf.organization_id,
                    workflow_id: wf.id,
                    status: 'running',
                    started_at: new Date().toISOString(),
                    context: context
                })
                .select()
                .single()

            if (execError) {
                console.error("[WebhookManager] Failed to create execution record:", execError)
                continue
            }

            try {
                console.log(`[WebhookManager] Starting workflow ${wf.name} (${wf.id}) Execution: ${execution.id}`)
                const definition = wf.definition as WorkflowDefinition

                const engine = new WorkflowEngine(definition, context)
                await engine.start()

                // Update Execution Status: Completed
                await supabase
                    .from('workflow_executions')
                    .update({
                        status: 'completed',
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', execution.id)

            } catch (err: any) {
                console.error(`[WebhookManager] Failed to run workflow ${wf.id}:`, err)

                // Update Execution Status: Failed
                await supabase
                    .from('workflow_executions')
                    .update({
                        status: 'failed',
                        completed_at: new Date().toISOString(),
                        error_message: err.message
                    })
                    .eq('id', execution.id)
            }

        }
    }
}

// Export singleton
export const webhookManager = WebhookManager.getInstance()
