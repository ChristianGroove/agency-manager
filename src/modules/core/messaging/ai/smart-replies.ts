"use server"

import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

interface Message {
    role: 'system' | 'user' | 'assistant'
    content: string
}

interface SmartReply {
    type: 'short' | 'medium' | 'detailed'
    text: string
    tokens: number
}

interface GenerateRepliesOptions {
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
 * Generate 3 AI-powered reply suggestions
 */
export async function generateSmartReplies(
    options: GenerateRepliesOptions
): Promise<{ success: boolean; replies?: SmartReply[]; error?: string; generationTimeMs?: number }> {
    const startTime = Date.now()

    try {
        // Build context from conversation history
        const messages: Message[] = [
            {
                role: 'system',
                content: buildSystemPrompt(options.businessContext, options.customerContext)
            },
            ...buildConversationContext(options.conversationHistory)
        ]

        // Generate responses with OpenAI
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages,
            temperature: 0.7,
            max_tokens: 500,
            response_format: { type: 'json_object' }
        })

        const generationTimeMs = Date.now() - startTime
        const responseText = completion.choices[0]?.message?.content

        if (!responseText) {
            return { success: false, error: 'No response from AI' }
        }

        const parsed = JSON.parse(responseText)
        const replies: SmartReply[] = [
            { type: 'short', text: parsed.short, tokens: estimateTokens(parsed.short) },
            { type: 'medium', text: parsed.medium, tokens: estimateTokens(parsed.medium) },
            { type: 'detailed', text: parsed.detailed, tokens: estimateTokens(parsed.detailed) }
        ]

        return { success: true, replies, generationTimeMs }
    } catch (error: any) {
        console.error('[SmartReplies] Generation failed:', error)
        return { success: false, error: error.message }
    }
}

function buildSystemPrompt(businessContext?: string, customerContext?: any): string {
    const basePrompt = `You are an AI assistant helping a customer service agent respond to messages.

Your task: Generate 3 response suggestions (short, medium, detailed) based on the conversation.

Guidelines:
- Be professional, friendly, and helpful
- Match the tone of previous agent messages
- Address the customer's question/concern directly
- Use the customer's name if available
- Be concise but complete

${businessContext ? `Business Context: ${businessContext}` : ''}
${customerContext?.name ? `Customer Name: ${customerContext.name}` : ''}
${customerContext?.tags?.length ? `Customer Tags: ${customerContext.tags.join(', ')}` : ''}
${customerContext?.priority === 'urgent' ? 'IMPORTANT: This is an URGENT inquiry - prioritize speed and empathy' : ''}

Return JSON format:
{
  "short": "Brief 1-sentence response (under 50 chars)",
  "medium": "Standard response (2-3 sentences, 100-150 chars)",
  "detailed": "Comprehensive response (multiple paragraphs if needed)"
}`

    return basePrompt
}

function buildConversationContext(
    history: Array<{ content: string; direction: 'incoming' | 'outgoing'; created_at: string }>
): Message[] {
    // Take last 5 messages for context
    return history.slice(-5).map(msg => ({
        role: msg.direction === 'incoming' ? 'user' : 'assistant',
        content: msg.content
    }))
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
