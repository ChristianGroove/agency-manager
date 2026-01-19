
import { ContextManager } from '../context-manager';
import { NodeExecutionResult } from '../types';

export interface SendMessageNodeData {
    actionType: 'send_message';
    message?: string;
}

export class SendMessageNode {
    constructor(private contextManager: ContextManager) { }

    async execute(data: SendMessageNodeData): Promise<NodeExecutionResult> {
        const messageContent = this.contextManager.resolve((data.message as string) || '');
        const { fileLogger } = await import('@/lib/file-logger');
        const { sendOutboundMessage } = await import('../../messaging/actions');

        fileLogger.log(`[SendMessageNode] Started. Message: "${messageContent}"`);

        try {
            // Extract context
            const conversationId = (
                this.contextManager.get('conversation.id') ||
                this.contextManager.get('conversationId') ||
                (this.contextManager.get('message') as any)?.conversationId
            ) as string;

            const channel = (
                this.contextManager.get('channel') ||
                this.contextManager.get('conversation.channel') ||
                'whatsapp'
            ) as string;

            if (!conversationId) {
                throw new Error("Missing required context: conversationId");
            }

            fileLogger.log(`[SendMessageNode] Sending via actions.ts. Conv=${conversationId}, Channel=${channel}`);

            // Send via Server Action (Robust Fallback)
            const result = await sendOutboundMessage(
                conversationId,
                { type: 'text', text: messageContent },
                channel
            );

            if (!result.success) {
                throw new Error(result.error || "Failed to send message via action");
            }

            fileLogger.log(`[SendMessageNode] Message sent successfully. ID: ${result.externalId}`);

            return { success: true };

        } catch (err: any) {
            fileLogger.log(`[SendMessageNode] EXCEPTION:`, err.message || err);
            throw new Error(`Send Message Failed: ${err.message}`);
        }
    }
}
