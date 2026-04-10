import { inngest } from "@/modules/infrastructure/automation/inngest/client"
import { InboxService } from "@/modules/features/messaging/inbox-service"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"

/**
 * Handle incoming WhatsApp/Messaging events asynchronously
 */
export const processIncomingMessage = inngest.createFunction(
    { 
        id: "process-incoming-message", 
        name: "Process Incoming Message (WhatsApp/Evolution)",
        // Retry logic: WhatsApp can be flaky, retry up to 5 times
        retries: 5
    },
    { event: "whatsapp/message.received" },
    async ({ event, step }) => {
        const { incomingMessage } = event.data

        // 1. Process via InboxService
        const result = await step.run("inbox-service-processing", async () => {
             const inboxService = new InboxService()
             return await inboxService.handleIncomingMessage(incomingMessage, supabaseAdmin)
        })

        // 2. Handle interactive elements (AI / Call permissions)
        const successResult = result?.success ? result as { success: true; conversationId: string; messageId: string } : null;

        if (successResult && incomingMessage.buttonId) {
            await step.run("interactive-logic-processing", async () => {
                const buttonId = incomingMessage.buttonId
                if (buttonId.startsWith('approve_call_perm') || buttonId.startsWith('deny_call_perm')) {
                     try {
                        const { webhookManager } = await import('@/modules/features/messaging/webhook-handler')
                        // Legacy hook for WebhookManager logic
                        await (webhookManager as any).processMessage(incomingMessage, 'whatsapp' as any);
                        return { status: 'button_processed' }
                     } catch (err) {
                        console.error('[Inngest:WhatsApp] Failed to process button logic:', err)
                        throw err // Trigger retry
                     }
                }
                return { status: 'no_special_logic' }
            })
        }

        // 3. Optional: Trigger AI automated response if enabled
        // (Placeholder for future IA worker decoupling)

        return { 
            success: result?.success || false, 
            conversationId: successResult?.conversationId,
            messageId: successResult?.messageId
        }


    }
)
