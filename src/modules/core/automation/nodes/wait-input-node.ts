

import { ContextManager } from '../context-manager'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface WaitInputNodeData {
    // What we're waiting for
    inputType: 'button_click' | 'text' | 'any' | 'image' | 'location' | 'audio'

    // Timeout configuration
    timeout?: string  // e.g., "5m", "1h", "24h"
    timeoutAction: 'continue' | 'branch' | 'stop'
    timeoutBranchId?: string

    // Context override
    conversationId?: string

    // Validation (for text input)
    validation?: {
        type: 'regex' | 'contains' | 'length' | 'email' | 'phone' | 'number'
        value?: string
        min?: number
        max?: number
        errorMessage?: string
    }

    // Where to store the response
    storeAs?: string  // Variable name, e.g., "user_response"

    // For button responses - map button IDs to branches
    buttonBranches?: Record<string, string>  // { "btn_yes": "branch_yes", "btn_no": "branch_no" }

    // For text matching fallback
    buttonOptions?: Array<{ id: string, title: string }>
}

export interface WaitInputResult {
    success: boolean
    suspended: boolean
    userInput?: string
    buttonId?: string
    nextBranchId?: string
    error?: string
}

export class WaitInputNode {
    constructor(private contextManager: ContextManager) { }

    /**
     * Start waiting for user input.
     * This will suspend the workflow and store state for later resume.
     */
    async startWaiting(data: WaitInputNodeData, executionId: string, nodeId: string): Promise<WaitInputResult> {
        try {
            console.log('[WaitInputNode] Starting wait for:', data.inputType)

            const orgId = this.contextManager.get('organization_id')
            const conversationId = (
                data.conversationId || // Direct override
                this.contextManager.get('conversation.id') ||
                this.contextManager.get('conversationId') ||
                (this.contextManager.get('message') as any)?.conversationId ||
                ((this.contextManager.get('execution') as any)?.context?.conversationId) // Fallback to deep execution context
            ) as string

            if (!conversationId) {
                console.error('[WaitInputNode] Context keys:', Object.keys(this.contextManager.getAll()))
                return { success: false, suspended: false, error: 'No conversation context' }
            }

            // Calculate resume time for timeout
            let resumeAt: Date | null = null
            if (data.timeout) {
                resumeAt = this.parseTimeout(data.timeout)
            }

            // Store pending input state in database
            const { error } = await supabaseAdmin
                .from('workflow_pending_inputs')
                .upsert({
                    execution_id: executionId,
                    node_id: nodeId,
                    organization_id: orgId,
                    conversation_id: conversationId,
                    input_type: data.inputType,
                    config: data,
                    status: 'waiting',
                    timeout_at: resumeAt?.toISOString(),
                    created_at: new Date().toISOString()
                }, {
                    onConflict: 'execution_id,node_id'
                })

            if (error) {
                console.error('[WaitInputNode] Failed to store pending state:', error)
                return { success: false, suspended: false, error: error.message }
            }

            console.log('[WaitInputNode] Workflow suspended, waiting for input')

            return {
                success: true,
                suspended: true
            }

        } catch (error) {
            console.error('[WaitInputNode] Error:', error)
            return {
                success: false,
                suspended: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    /**
     * Process incoming input to check if we can resume.
     */
    async processInput(
        pendingInput: any,
        incomingMessage: { type: string; content: string; buttonId?: string }
    ): Promise<WaitInputResult> {
        try {
            const config = pendingInput.config as WaitInputNodeData
            let processedMessage = { ...incomingMessage }

            // Special Handling: Text-to-Button matching
            // If we are waiting for a button click, but received text, check if it matches a button title
            if (config.inputType === 'button_click' && processedMessage.type === 'text' && !processedMessage.buttonId) {
                if (config.buttonOptions && config.buttonOptions.length > 0) {
                    const cleanText = processedMessage.content.trim().toLowerCase()
                    const matchedButton = config.buttonOptions.find(opt =>
                        opt.title.trim().toLowerCase() === cleanText
                    )

                    if (matchedButton) {
                        console.log(`[WaitInputNode] Matched text "${processedMessage.content}" to button ${matchedButton.id}`)
                        processedMessage.type = 'interactive' // Treat as interactive now
                        processedMessage.buttonId = matchedButton.id
                    }
                }
            }

            // Check if input type matches
            if (config.inputType !== 'any') {
                const typeMap: Record<string, string[]> = {
                    'button_click': ['interactive', 'button_reply'],
                    'text': ['text'],
                    'image': ['image'],
                    'location': ['location'],
                    'audio': ['audio', 'voice']
                }

                const expectedTypes = typeMap[config.inputType] || [config.inputType]
                // Note: We check against processedMessage.type which might have been updated to 'interactive'
                if (!expectedTypes.includes(processedMessage.type)) {
                    // Wrong type, still waiting
                    return { success: false, suspended: true, error: 'Waiting for different input type' }
                }
            }

            // Validate text input if needed (only if it remains text)
            if (config.validation && processedMessage.type === 'text') {
                const isValid = this.validateInput(processedMessage.content, config.validation)
                if (!isValid) {
                    return {
                        success: false,
                        suspended: true,
                        error: config.validation.errorMessage || 'Invalid input'
                    }
                }
            }

            // Determine which branch to follow for button clicks
            let nextBranchId: string | undefined
            if (processedMessage.buttonId && config.buttonBranches) {
                nextBranchId = config.buttonBranches[processedMessage.buttonId]
            }

            // Mark as completed
            await supabaseAdmin
                .from('workflow_pending_inputs')
                .update({
                    status: 'completed',
                    response: incomingMessage,
                    completed_at: new Date().toISOString()
                })
                .eq('id', pendingInput.id)

            return {
                success: true,
                suspended: false,
                userInput: processedMessage.content,
                buttonId: processedMessage.buttonId,
                nextBranchId
            }

        } catch (error) {
            console.error('[WaitInputNode] Process error:', error)
            return { success: false, suspended: false, error: 'Processing failed' }
        }
    }

    /**
     * Handle timeout - called by cron job
     */
    async handleTimeout(pendingInput: any): Promise<WaitInputResult> {
        const config = pendingInput.config as WaitInputNodeData

        await supabaseAdmin
            .from('workflow_pending_inputs')
            .update({
                status: 'timeout',
                completed_at: new Date().toISOString()
            })
            .eq('id', pendingInput.id)

        switch (config.timeoutAction) {
            case 'continue':
                return { success: true, suspended: false }

            case 'branch':
                return {
                    success: true,
                    suspended: false,
                    nextBranchId: config.timeoutBranchId
                }

            case 'stop':
            default:
                return { success: false, suspended: false, error: 'Timeout - workflow stopped' }
        }
    }

    private parseTimeout(timeout: string): Date {
        const now = new Date()
        const value = parseInt(timeout)
        const unit = timeout.slice(-1)

        switch (unit) {
            case 'm': // minutes
                now.setMinutes(now.getMinutes() + value)
                break
            case 'h': // hours
                now.setHours(now.getHours() + value)
                break
            case 'd': // days
                now.setDate(now.getDate() + value)
                break
            default:
                now.setMinutes(now.getMinutes() + value) // Default to minutes
        }

        return now
    }

    private validateInput(input: string, validation: WaitInputNodeData['validation']): boolean {
        if (!validation) return true

        switch (validation.type) {
            case 'regex':
                return new RegExp(validation.value || '').test(input)

            case 'contains':
                return input.toLowerCase().includes((validation.value || '').toLowerCase())

            case 'length':
                const len = input.length
                if (validation.min && len < validation.min) return false
                if (validation.max && len > validation.max) return false
                return true

            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)

            case 'phone':
                return /^[\d\s+()-]{10,}$/.test(input)

            case 'number':
                return !isNaN(Number(input))

            default:
                return true
        }
    }
}
