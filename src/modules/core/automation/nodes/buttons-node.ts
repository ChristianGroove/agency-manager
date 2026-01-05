

import { ContextManager } from '../context-manager'
import { sendOutboundMessage } from '@/modules/core/messaging/actions'
import { InteractiveButton, InteractiveListSection } from '@/modules/core/messaging/providers/types'

export interface ButtonsNodeData {
    // Message configuration
    messageType: 'buttons' | 'list' | 'cta'
    body: string  // Main message (supports {{variables}})
    header?: {
        type: 'text' | 'image'
        content: string  // Text or URL
    }
    footer?: string

    // For buttons type (max 3)
    buttons?: Array<{
        id: string
        title: string
        branchId?: string  // Optional: link to specific branch in workflow
    }>

    // For list type
    listButtonText?: string  // e.g., "Ver opciones"
    sections?: Array<{
        title?: string
        rows: Array<{
            id: string
            title: string
            description?: string
        }>
    }>

    // For CTA type
    ctaButtons?: Array<{
        type: 'url' | 'phone'
        text: string
        value: string  // URL or phone number
    }>

    // Wait for response
    waitForResponse?: boolean
    timeout?: string  // e.g., "1h", "24h"
    timeoutBranchId?: string  // Branch to follow on timeout

    // Context
    conversationId?: string
}

export class ButtonsNode {
    constructor(private contextManager: ContextManager) { }

    async execute(data: ButtonsNodeData): Promise<{
        success: boolean
        messageId?: string
        error?: string
        selectedButtonId?: string
    }> {
        try {
            console.log('[ButtonsNode] Executing with type:', data.messageType)

            // Resolve variables in message content
            const body = this.contextManager.resolve(data.body)
            const footer = data.footer ? this.contextManager.resolve(data.footer) : undefined

            // Get conversation info from context
            const conversationId = (data.conversationId || this.contextManager.get('conversation.id')) as string
            const recipientPhone = this.contextManager.get('message.sender') ||
                this.contextManager.get('lead.phone')

            if (!conversationId) {
                return { success: false, error: 'No conversation ID available' }
            }

            // Build message content based on type
            let messageContent: any

            switch (data.messageType) {
                case 'buttons':
                    const buttons: InteractiveButton[] = (data.buttons || []).map(btn => ({
                        id: btn.id,
                        title: this.contextManager.resolve(btn.title),
                        payload: btn.branchId  // Store branch ID for later routing
                    }))

                    messageContent = {
                        type: 'interactive_buttons' as const,
                        body,
                        footer,
                        buttons,
                        header: data.header ? {
                            type: data.header.type,
                            text: data.header.type === 'text' ? this.contextManager.resolve(data.header.content) : undefined,
                            mediaUrl: data.header.type === 'image' ? data.header.content : undefined
                        } : undefined
                    }
                    break

                case 'list':
                    const sections: InteractiveListSection[] = (data.sections || []).map(section => ({
                        title: section.title ? this.contextManager.resolve(section.title) : undefined,
                        rows: section.rows.map(row => ({
                            id: row.id,
                            title: this.contextManager.resolve(row.title),
                            description: row.description ? this.contextManager.resolve(row.description) : undefined
                        }))
                    }))

                    messageContent = {
                        type: 'interactive_list' as const,
                        body,
                        footer,
                        buttonText: data.listButtonText || 'Ver opciones',
                        sections,
                        header: data.header?.type === 'text' ? this.contextManager.resolve(data.header.content) : undefined
                    }
                    break

                case 'cta':
                    messageContent = {
                        type: 'interactive_cta' as const,
                        body,
                        footer,
                        buttons: (data.ctaButtons || []).map(btn => ({
                            type: btn.type,
                            text: this.contextManager.resolve(btn.text),
                            url: btn.type === 'url' ? btn.value : undefined,
                            phoneNumber: btn.type === 'phone' ? btn.value : undefined
                        })),
                        header: data.header ? {
                            type: data.header.type,
                            text: data.header.type === 'text' ? this.contextManager.resolve(data.header.content) : undefined,
                            mediaUrl: data.header.type === 'image' ? data.header.content : undefined
                        } : undefined
                    }
                    break

                default:
                    return { success: false, error: `Unknown message type: ${data.messageType}` }
            }

            // Send the message
            const result = await sendOutboundMessage(
                conversationId,
                messageContent,
                'whatsapp'
            )

            if (!result.success) {
                console.error('[ButtonsNode] Failed to send:', result.error)
                return { success: false, error: result.error }
            }

            console.log('[ButtonsNode] Message sent successfully:', result.externalId)

            // Store message ID in context for tracking
            this.contextManager.set('lastButtonMessageId', result.externalId)
            this.contextManager.set('lastButtonType', data.messageType)

            // If waiting for response, the engine should suspend here
            if (data.waitForResponse) {
                this.contextManager.set('_awaitingButtonResponse', {
                    messageId: result.externalId,
                    buttons: data.buttons || data.sections?.flatMap(s => s.rows) || [],
                    timeout: data.timeout,
                    timeoutBranchId: data.timeoutBranchId,
                    startedAt: new Date().toISOString()
                })
            }

            return {
                success: true,
                messageId: result.externalId
            }

        } catch (error) {
            console.error('[ButtonsNode] Execution error:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }
}
