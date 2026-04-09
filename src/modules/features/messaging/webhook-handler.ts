

import { createClient } from "@/lib/supabase-server"
import { ChannelType, MessageContentType } from "@/types/messaging"
import { WorkflowEngine, WorkflowDefinition } from "@/modules/features/automation/engine"
import { MessagingProvider, IncomingMessage, IncomingCall } from "./providers/types"
import { inboxService } from "./inbox-service"
import { callingSignalingHandler } from "@/lib/meta/calling/calling-signaling-handler"

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
        console.log(`[WebhookManager] 🚩 handle() entry for channel: ${channel}, method: ${request.method}`)
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
                await this.processMessage(msg, channel)
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
                await this.processMessage(msg, channel)
            }

            return { success: true }
        } catch (error: any) {
            const errorMsg = error?.message || String(error)
            console.error(`[WebhookManager] Error in handleParsed:`, errorMsg, error?.stack)
            return { success: false, message: `Internal processing error: ${errorMsg}` }
        }
    }

    private async processMessage(inputMsg: IncomingMessage | IncomingCall, channel: ChannelType) {

        // 0. HANDLE CALL SIGNALING (WebRTC)
        if ('type' in inputMsg && inputMsg.type === 'call_signaling') {
            const msg = inputMsg as IncomingCall;
            console.log(`[WebhookManager] 📞 Processing Call Signaling: ${msg.id} (${msg.event})`);

            if (msg.event === 'offer') {
                try {
                    // 1. Process Offer via Signaling Handler (Generates Answer)
                    const { sdpAnswer, callSetup } = await callingSignalingHandler.processOffer({
                        callId: msg.call_id,
                        fromPhoneNumber: msg.from,
                        sdpOffer: msg.payload || ''
                    });

                    // 2. Send SDP Answer back to Meta via Provider
                    const provider = this.providers[channel];
                    if (provider && 'sendSignalingMessage' in provider) {
                        // Cast to MetaProvider-like interface or check method existence
                        await (provider as any).sendSignalingMessage(msg.from, sdpAnswer, msg.call_id);
                        console.log(`[WebhookManager] ✅ SDP Answer sent for call ${msg.call_id}`);

                        // 3. Notify Frontend about Inbound Call
                        const { supabaseAdmin } = await import("@/lib/supabase-admin")
                        await supabaseAdmin.from('notifications').insert({
                            type: 'inbound_call',
                            recipient_id: null, // Global for the connection/org agents
                            data: {
                                call_id: msg.call_id,
                                from: msg.from,
                                channel: channel,
                                timestamp: msg.timestamp
                            },
                            status: 'unread'
                        });
                        await supabaseAdmin.channel(`calling:${msg.from}`).send({
                            type: 'broadcast',
                            event: 'incoming_call',
                            payload: { call_id: msg.call_id, from: msg.from }
                        });
                    } else {
                        console.warn('[WebhookManager] Provider does not support signaling messages');
                    }

                } catch (error: any) {
                    console.error('[WebhookManager] ❌ Call Signaling Error:', error.message);
                }
            }
            return; // Stop processing (do not save to inbox generic messages for now)
        }

        const msg = inputMsg as IncomingMessage;

        // 1. SAVE TO INBOX (Use Admin client for Webhooks)
        const { supabaseAdmin } = await import('@/lib/supabase-admin')
        const result = await inboxService.handleIncomingMessage(msg, supabaseAdmin)

        if (!result || !result.success || !result.conversationId) {
            console.error('[WebhookManager] Failed to save message to inbox')
            return
        }

        const conversationId = result.conversationId

        // 1.5 CHECK FOR INTERACTIVE QUOTES / PERMISSIONS
        // Robust fallback for various Meta payload structures
        let buttonId = (
            msg.buttonId || 
            (msg.content as any)?.raw?.button_reply?.id || 
            (msg.content as any)?.raw?.button?.payload ||
            ''
        ).trim();
        
        console.log(`[WebhookManager] [DEBUG] Processing message with buttonId: "${buttonId}"`);

        if (buttonId) {


            // Handle Quote Approval
            if (buttonId.startsWith('approve_cart_')) {
                const cartId = buttonId.replace('approve_cart_', '')


                try {
                    const { handleQuoteApproval } = await import('@/modules/features/crm/services/logic/quote-response-handler')
                    const { data: conv } = await (await import('@/lib/supabase-admin')).supabaseAdmin
                        .from('conversations')
                        .select('connection_id, phone')
                        .order('created_at', { ascending: false })
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
                    const { handleQuoteRejection } = await import('@/modules/features/crm/services/logic/quote-response-handler')
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
                // ... existing logic ...
                const parts = buttonId.replace('rejection_reason_', '').split('_')
                const cartId = parts.slice(0, -1).join('_') // Handle UUIDs with dashes
                const reason = msg.content.text || 'Unknown'

                try {
                    const { handleRejectionReasonSelected } = await import('@/modules/features/crm/services/logic/quote-response-handler')
                    await handleRejectionReasonSelected(cartId, reason, conversationId)
                } catch (e: any) {
                    console.error('[WebhookManager] Rejection reason error:', e.message)
                }
                return // Stop further processing
            }

            // --- META 2026: CALL PERMISSION HANDLING ---
            const cleanButtonId = buttonId.trim();
            const isApproval = cleanButtonId === 'approve_call_perm' || cleanButtonId.startsWith('approve_call_perm_');
            const isDenial = cleanButtonId === 'deny_call_perm' || cleanButtonId.startsWith('deny_call_perm_');

            if (isApproval || isDenial) {
                console.log(`[WebhookManager] 🛡️ Recognized Call Permission: ${cleanButtonId} for conversation ${conversationId}`);
                try {
                    const { supabaseAdmin } = await import('@/lib/supabase-admin');
                    const { CallPermissionManager } = await import('@/lib/meta/calling/call-permission-manager');
                    const pm = new CallPermissionManager();

                    // Resolve Lead ID from Conversation
                    const { data: conv, error: convErr } = await supabaseAdmin
                        .from('conversations')
                        .select('lead_id, organization_id')
                        .eq('id', conversationId)
                        .single();

                    if (convErr || !conv?.lead_id) {
                        console.warn(`[WebhookManager] ❌ Lead ID missing (Err: ${convErr?.message}) for conversation ${conversationId}`);
                        throw new Error("No lead linked to conversation");
                    }

                    console.log(`[WebhookManager] 🔍 Found Lead ID: ${conv.lead_id} (Org: ${conv.organization_id})`);

                    if (cleanButtonId.startsWith('approve_call_perm')) {
                        console.log(`[WebhookManager] [DEBUG] Attempting to approve call permission for conversation ${conversationId}`);
                        // Find latest pending permission via conversation metadata
                        const history = await (pm as any).getHistoryFromDb(conversationId);
                        console.log(`[WebhookManager] [DEBUG] Found ${history.length} permission items in history`);
                        const latestPending = [...history].reverse().find((p: any) => p.status === 'pending');
                        
                        if (latestPending) {
                            console.log(`[WebhookManager] [DEBUG] Approving pending perm ID: ${latestPending.id}`);
                            await pm.approvePermission(conversationId, latestPending.id);
                            console.log(`[WebhookManager] ✅ Call permission APPROVED for conversation ${conversationId}`);
                        } else {
                            console.log(`[WebhookManager] [DEBUG] ⚠️ No pending perm found in history. Available statuses: ${history.map((h: any) => h.status).join(', ')}`);
                            // Fallback: Just approve a new one if somehow none is found
                            await pm.requestPermission({ conversationId, phoneNumber: msg.from, reason: 'Consentimiento implícito vía botón' });
                            const newHistory = await (pm as any).getHistoryFromDb(conversationId);
                            const newPending = [...newHistory].reverse().find((p: any) => p.status === 'pending');
                            if (newPending) {
                                console.log(`[WebhookManager] [DEBUG] Created and approving fallback perm: ${newPending.id}`);
                                await pm.approvePermission(conversationId, newPending.id);
                            }
                        }
                    } else {
                         // Find and Deny latest pending
                         console.log(`[WebhookManager] Denying call perm for conversation ${conversationId}`);
                         const history = await (pm as any).getHistoryFromDb(conversationId);
                         const latestPending = [...history].reverse().find((p: any) => p.status === 'pending');
                         if (latestPending) await pm.denyPermission(conversationId, latestPending.id);
                         console.log(`[WebhookManager] ❌ Call permission DENIED for conversation ${conversationId}`);
                    }
                } catch (e: any) {
                    console.error('[WebhookManager] ❌ Call permission error:', e.message);
                }
                return;
            }
        }

        // 2. CHECK SUSPENDED WORKFLOWS (Pending Inputs)
        // Use Admin client because Webhooks are unauthenticated system events
        const { fileLogger } = await import('@/lib/file-logger') // Import Logger
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

        // Log what we found
        fileLogger.log(`[WebhookManager] Checking pending inputs for conversation ${conversationId}`, {
            hasPending: !!pendingInput,
            pendingId: pendingInput?.id,
            buttonId: buttonId
        })

        if (pendingInput) {
            console.log(`[WebhookManager] Found pending input for conversation ${conversationId}`)
            const { resumeSuspendedWorkflow } = await import('@/modules/features/automation/runner')

            // Resume
            const result = await resumeSuspendedWorkflow(pendingInput.execution_id, pendingInput.id, msg)

            fileLogger.log(`[WebhookManager] Resume Attempt`, { success: result.success, error: result.error })

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
        // REMOVED: Automation handling is now centralized in InboxService (lines 80-90)
        // InboxService calls AutomationTriggerService.evaluateInput() after saving the message.
        // Keeping this here causes DOUBLE EXECUTION.

        console.log('[WebhookManager] Message processed. Automation triggered via InboxService if applicable.')
    }
}

// Export singleton
export const webhookManager = WebhookManager.getInstance()
