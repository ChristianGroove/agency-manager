"use server"

import { AIEngine } from "@/modules/infrastructure/ai-engine/service"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"

const PUBLIC_GENERATION_ERROR = 'Smart replies could not be generated'
const PUBLIC_REFINE_ERROR = 'Draft could not be refined'

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeAiError(error: unknown) {
    if (error instanceof Error) {
        return { name: error.name }
    }

    if (error && typeof error === 'object') {
        return {
            type: (error as any).type,
            code: (error as any).code,
            status: (error as any).status,
            statusCode: (error as any).statusCode,
            hasMessage: typeof (error as any).message === 'string' && (error as any).message.length > 0,
        }
    }

    return { type: typeof error }
}

function publicAiError(publicMessage: string, error: unknown) {
    if (isDeployedRuntime()) return publicMessage
    return error instanceof Error ? error.message : publicMessage
}

function logSmartRepliesError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizeAiError(error))
}

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
    processContext?: {
        state: string
        stateKey: string
        goal: string
        description?: string
        nextActions?: string[]
    }
}

type SupabaseServerClient = Awaited<ReturnType<typeof import('@/modules/core/database/supabase-server').createClient>>

async function verifySuggestionConversationAccess(
    supabase: SupabaseServerClient,
    orgId: string,
    conversationId: string,
    messageId?: string
) {
    const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('organization_id', orgId)
        .single()

    if (!conversation) return false

    if (!messageId) return true

    const { data: message } = await supabase
        .from('messages')
        .select('id')
        .eq('id', messageId)
        .eq('conversation_id', conversationId)
        .eq('organization_id', orgId)
        .single()

    return Boolean(message)
}

/**
 * Generate 3 AI-powered reply suggestions via Central Engine
 */
export async function generateSmartReplies(
    options: GenerateRepliesOptions
): Promise<{ success: boolean; replies?: SmartReply[]; error?: string; generationTimeMs?: number; usedKnowledge?: number }> {
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
                priority: options.customerContext?.priority,
                // Inject Process Context for "Intelligent" replies
                processState: options.processContext?.state,
                processGoal: options.processContext?.goal,
                processDescription: options.processContext?.description
            }
        })

        const generationTimeMs = Date.now() - startTime
        const data = result.data // Already parsed JSON from Engine

        const replies: SmartReply[] = [
            { type: 'short', text: data.short, tokens: estimateTokens(data.short) },
            { type: 'medium', text: data.medium, tokens: estimateTokens(data.medium) },
            { type: 'detailed', text: data.detailed, tokens: estimateTokens(data.detailed) }
        ]

        return {
            success: true,
            replies,
            generationTimeMs,
            usedKnowledge: Array.isArray(result.context) ? result.context.length : 0
        }

    } catch (error: any) {
        logSmartRepliesError('[SmartReplies] Generation failed:', error)
        return { success: false, error: publicAiError(PUBLIC_GENERATION_ERROR, error) }
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
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return

    const { createClient } = await import('@/modules/core/database/supabase-server')
    const supabase = await createClient()

    const hasAccess = await verifySuggestionConversationAccess(supabase, orgId, data.conversationId, data.messageId)
    if (!hasAccess) return

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
        logSmartRepliesError('[SmartReplies] Failed to log suggestion:', error)
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
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return

    const { createClient } = await import('@/modules/core/database/supabase-server')
    const supabase = await createClient()

    const { data: suggestion } = await supabase
        .from('ai_suggestions')
        .select('id, conversation_id')
        .eq('id', suggestionId)
        .single()

    if (!suggestion?.conversation_id) return

    const hasAccess = await verifySuggestionConversationAccess(supabase, orgId, suggestion.conversation_id)
    if (!hasAccess) return

    await supabase
        .from('ai_suggestions')
        .update({
            selected_response: selectedType,
            final_message: finalMessage,
            was_edited: wasEdited,
            used_at: new Date().toISOString()
        })
        .eq('id', suggestionId)
        .eq('conversation_id', suggestion.conversation_id)
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
        logSmartRepliesError('[SmartReplies] Refine failed:', error)
        return { success: false, error: publicAiError(PUBLIC_REFINE_ERROR, error) }
    }
}
