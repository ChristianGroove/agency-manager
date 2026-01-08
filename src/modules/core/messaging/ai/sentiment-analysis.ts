// "use server" removed partially

import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "stub_key_for_build_only",
})

interface SentimentResult {
    sentiment: 'positive' | 'neutral' | 'negative' | 'urgent'
    score: number // -1.0 to 1.0
    emotions: string[] // ['happy', 'frustrated', 'angry', etc.]
    urgentKeywords?: string[]
    needsEscalation: boolean
}

import { AIEngine } from "@/modules/core/ai-engine/service"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

/**
 * Analyze sentiment of a message using Central Engine
 */
export async function analyzeSentiment(messageContent: string): Promise<{
    success: boolean
    result?: SentimentResult
    error?: string
}> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Unauthorized" }

    try {
        const response = await AIEngine.executeTask({
            organizationId: orgId,
            taskType: 'inbox.sentiment_v1',
            payload: { message: messageContent }
        })

        const result: SentimentResult = response.data
        return { success: true, result }

    } catch (error: any) {
        console.error('[SentimentAnalysis] Failed:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Simple keyword-based sentiment fallback (for speed/cost savings)
 */
export function analyzeKeywords(messageContent: string): SentimentResult {
    const text = messageContent.toLowerCase()

    // Urgent keywords
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'emergency', 'lawyer', 'legal', 'sue', 'unacceptable']
    const foundUrgent = urgentKeywords.filter(kw => text.includes(kw))

    // Negative keywords
    const negativeKeywords = ['terrible', 'worst', 'awful', 'horrible', 'disappointed', 'frustrated', 'angry', 'refund', 'cancel']
    const foundNegative = negativeKeywords.filter(kw => text.includes(kw))

    // Positive keywords
    const positiveKeywords = ['thank', 'thanks', 'great', 'excellent', 'perfect', 'love', 'amazing', 'awesome']
    const foundPositive = positiveKeywords.filter(kw => text.includes(kw))

    let sentiment: 'positive' | 'neutral' | 'negative' | 'urgent' = 'neutral'
    let score = 0
    let emotions: string[] = []

    if (foundUrgent.length > 0) {
        sentiment = 'urgent'
        score = -0.9
        emotions = ['urgent', 'angry']
    } else if (foundNegative.length > foundPositive.length) {
        sentiment = 'negative'
        score = -0.5 - (foundNegative.length * 0.1)
        emotions = ['frustrated', 'disappointed']
    } else if (foundPositive.length > foundNegative.length) {
        sentiment = 'positive'
        score = 0.5 + (foundPositive.length * 0.1)
        emotions = ['happy', 'satisfied']
    }

    // Cap score
    score = Math.max(-1, Math.min(1, score))

    return {
        sentiment,
        score,
        emotions,
        urgentKeywords: foundUrgent.length > 0 ? foundUrgent : undefined,
        needsEscalation: sentiment === 'urgent' || score < -0.7
    }
}

/**
 * Save sentiment to database
 */
export async function saveSentimentAnalysis(
    messageId: string,
    conversationId: string,
    result: SentimentResult
) {
    "use server"
    const { createClient } = await import('@/lib/supabase-server')
    const supabase = await createClient()

    // Update message with sentiment
    await supabase
        .from('messages')
        .update({
            sentiment: result.sentiment,
            sentiment_score: result.score,
            detected_emotions: result.emotions
        })
        .eq('id', messageId)

    // Create alert if needs escalation
    if (result.needsEscalation) {
        await supabase
            .from('sentiment_alerts')
            .insert({
                conversation_id: conversationId,
                message_id: messageId,
                alert_type: result.sentiment === 'urgent' ? 'urgent_keywords' : 'negative_spike',
                severity: result.sentiment === 'urgent' ? 'critical' : 'high',
                sentiment_score: result.score,
                detected_keywords: result.urgentKeywords || []
            })
    }
}

/**
 * Auto-escalate conversation if sentiment is critical
 */
export async function autoEscalateIfNeeded(
    conversationId: string,
    result: SentimentResult
) {
    "use server"
    if (!result.needsEscalation) return

    const { createClient } = await import('@/lib/supabase-server')
    const supabase = await createClient()

    // Find supervisor or senior agent
    // For now, just mark conversation as urgent priority
    await supabase
        .from('conversations')
        .update({
            priority: 'urgent',
            tags: supabase.rpc('array_append', {
                arr: 'tags',
                elem: 'escalated'
            })
        })
        .eq('id', conversationId)

    console.log(`[SentimentAnalysis] Auto-escalated conversation ${conversationId}`)
}
