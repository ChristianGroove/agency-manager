
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

        fileLogger.log(`[SendMessageNode] Started. Message: "${messageContent}"`);

        try {
            // Dynamic import to avoid cycles
            const { outboundService } = await import('../../messaging/outbound-service');

            // Extract context
            const connectionId = this.contextManager.get('connection_id') as string;
            // Try to find recipient in various context locations
            const recipient =
                (this.contextManager.get('message') as any)?.sender ||
                (this.contextManager.get('lead') as any)?.phone ||
                this.contextManager.get('userPhone');

            const orgId = this.contextManager.get('organization_id') as string;

            fileLogger.log(`[SendMessageNode] Context: connectionId=${connectionId}, recipient=${recipient}, orgId=${orgId}`);

            if (!connectionId || !recipient || !orgId) {
                const errMsg = `Missing required context for sending: conn=${connectionId}, recipient=${recipient}, org=${orgId}`;
                fileLogger.log(`[SendMessageNode] ERROR: ${errMsg}`);
                throw new Error(errMsg);
            }

            // Send via OutboundService
            await outboundService.sendMessage(
                connectionId,
                recipient,
                messageContent,
                orgId
            );

            fileLogger.log(`[SendMessageNode] Message sent successfully via connection ${connectionId}`);

            return { success: true };

        } catch (err: any) {
            const { fileLogger } = await import('@/lib/file-logger');
            fileLogger.log(`[SendMessageNode] EXCEPTION:`, err.message || err);
            throw new Error(`Send Message Failed: ${err.message}`);
        }
    }
}
