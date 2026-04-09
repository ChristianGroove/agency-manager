
import { ContextManager } from '../context-manager';
import { NodeExecutionResult } from '../types';

export interface SendMessageNodeData {
    actionType: 'send_message';
    message?: string;
    headerMediaType?: 'none' | 'image' | 'video' | 'document';
    headerMediaUrl?: string;
    headerText?: string; // Title
    footerText?: string;
}

export class SendMessageNode {
    constructor(private contextManager: ContextManager) { }

    async execute(data: SendMessageNodeData): Promise<NodeExecutionResult> {
        const { fileLogger } = await import('@/lib/file-logger');
        const { outboundService } = await import('@/modules/features/messaging/outbound-service');

        // 1. Resolve Variables in all Text Fields
        const body = this.contextManager.resolve((data.message as string) || '');
        const headerText = data.headerText ? this.contextManager.resolve(data.headerText) : '';
        const footerText = data.footerText ? this.contextManager.resolve(data.footerText) : '';
        const mediaUrl = data.headerMediaUrl ? this.contextManager.resolve(data.headerMediaUrl) : '';
        const mediaType = data.headerMediaType || 'none';

        fileLogger.log(`[SendMessageNode] Started. Type=${mediaType}, BodyLen=${body.length}`);

        try {
            // 2. Extract Context
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

            const connectionId = this.contextManager.get('connection_id') as string | undefined;

            // 3. Construct Payload with WhatsApp Markdown for Header/Footer emulation
            let finalBody = body;

            // Prepend Header (Bold)
            if (headerText) {
                finalBody = `*${headerText}*\n\n${finalBody}`;
            }

            // Append Footer (Italic + Small separation)
            if (footerText) {
                finalBody = `${finalBody}\n\n_${footerText}_`;
            }

            let payload: any = {
                type: 'text',
                text: finalBody
            };

            // 4. Handle Media Types
            if (mediaType !== 'none' && mediaUrl) {
                if (mediaType === 'image') {
                    payload = {
                        type: 'image',
                        mediaUrl: mediaUrl,
                        caption: finalBody // Image caption supports markdown
                    };
                } else if (mediaType === 'video') {
                    payload = {
                        type: 'video',
                        mediaUrl: mediaUrl,
                        caption: finalBody
                    };
                } else if (mediaType === 'document') {
                    payload = {
                        type: 'document',
                        mediaUrl: mediaUrl,
                        caption: finalBody,
                        filename: headerText || 'Documento' // Use Title as filename if available
                    };
                }
            }

            fileLogger.log(`[SendMessageNode] Sending Payload: Type=${payload.type}, Media=${!!mediaUrl}`);

            // 5. Send Message (using Admin privileged service)
            const result = await outboundService.sendSystemMessage(
                conversationId,
                payload,
                channel,
                connectionId
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
