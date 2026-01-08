"use server"

import { AIEngine } from "@/modules/core/ai-engine/service"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

export interface SmartReply {
    type: 'short' | 'medium' | 'detailed'
    text: string
    tokens: number
}

export interface GenerateRepliesOptions {
    conversationHistory: Array<{
        content: string
        direction: 'incoming' | 'outgoing'
        created_at: string
    }>
    customerContext?: {
        name?: string
        tags?: string[]
        priority?: string
    }
    businessContext?: string
}

/**
 * Generate 3 AI-powered reply suggestions via Central Engine
 */
export async function generateSmartReplies(
    options: GenerateRepliesOptions
): Promise<{ success: boolean; replies?: SmartReply[]; error?: string; generationTimeMs?: number }> {
    const startTime = Date.now()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Organization Context Missing" }

    try {
        const result = await AIEngine.executeTask({
            organizationId: orgId,
            taskType: 'inbox.smart_replies_v1',
            payload: {
                history: options.conversationHistory,
                businessContext: options.businessContext,
                customerName: options.customerContext?.name,
                customerTags: options.customerContext?.tags,
                priority: options.customerContext?.priority
            }
        })

        const generationTimeMs = Date.now() - startTime
        const data = result.data // Already parsed JSON from Engine

        const replies: SmartReply[] = [
            { type: 'short', text: data.short, tokens: estimateTokens(data.short) },
            { type: 'medium', text: data.medium, tokens: estimateTokens(data.medium) },
            { type: 'detailed', text: data.detailed, tokens: estimateTokens(data.detailed) }
        ]

        return { success: true, replies, generationTimeMs }

    } catch (error: any) {
        console.error('[SmartReplies] Generation failed:', error)
        return { success: false, error: error.message }
    }
}



function estimateTokens(text: string): number {
    // Rough estimation: ~4 chars per token
    return Math.ceil(text.length / 4)
}

/**
 * Save suggestion to database for analytics
 */
export async function logSuggestion(data: {
    conversationId: string
    messageId: string
    suggestions: SmartReply[]
    generationTimeMs: number
    modelUsed?: string
}) {
    const { createClient } = await import('@/lib/supabase-server')
    const supabase = await createClient()

    const { error } = await supabase
        .from('ai_suggestions')
        .insert({
            conversation_id: data.conversationId,
            message_id: data.messageId,
            suggested_responses: data.suggestions,
            generation_time_ms: data.generationTimeMs,
            model_used: data.modelUsed || 'gpt-4-turbo-preview',
            context_messages_count: 5
        })

    if (error) {
        console.error('[SmartReplies] Failed to log suggestion:', error)
    }
}

/**
 * Mark suggestion as used
 */
export async function markSuggestionUsed(
    suggestionId: string,
    selectedType: string,
    finalMessage: string,
    wasEdited: boolean
) {
    const { createClient } = await import('@/lib/supabase-server')
    const supabase = await createClient()

    await supabase
        .from('ai_suggestions')
        .update({
            selected_response: selectedType,
            final_message: finalMessage,
            was_edited: wasEdited,
            used_at: new Date().toISOString()
        })
        .eq('id', suggestionId)
}

/**
 * Refine a draft message to be more professional and clear (Governance Enforced)
 */
export async function refineDraftContent(content: string): Promise<{ success: boolean; refined?: string; error?: string }> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Unauthorized" }

    try {
        if (!content || content.length < 5) return { success: false, error: 'Content too short' }

        const response = await AIEngine.executeTask({
            organizationId: orgId,
            taskType: 'messaging.refine_draft_v1',
            payload: { content }
        })

        // Engine returns strict string for this task (jsonMode: false)
        let refined = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)

        // Cleanup: Remove surrounding quotes if present
        if (refined.startsWith('"') && refined.endsWith('"')) {
            refined = refined.slice(1, -1);
        }

        return { success: true, refined: refined || content }

    } catch (error: any) {
        console.error('[SmartReplies] Refine failed:', error)
        return { success: false, error: error.message }
    }
}
