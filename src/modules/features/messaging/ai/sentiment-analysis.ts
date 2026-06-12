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

import { AIEngine } from "@/modules/infrastructure/ai-engine/service"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"

const PUBLIC_SENTIMENT_ERROR = 'Sentiment analysis failed'

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

function logSentimentError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizeAiError(error))
}

function logSentimentInfo(label: string, details: Record<string, unknown>) {
    if (!isDeployedRuntime()) {
        console.log(label, details)
        return
    }

    console.log(label, {
        conversationIdPresent: Boolean(details.conversationId),
        messageIdPresent: Boolean(details.messageId),
        escalated: Boolean(details.escalated),
    })
}

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
        logSentimentError('[SentimentAnalysis] Failed:', error)
        return { success: false, error: publicAiError(PUBLIC_SENTIMENT_ERROR, error) }
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
    const { createClient } = await import('@/modules/core/database/supabase-server')
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

    const orgId = await getCurrentOrganizationId()
    if (!orgId) return

    const { createClient } = await import('@/modules/core/database/supabase-server')
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
        .eq('organization_id', orgId)

    logSentimentInfo('[SentimentAnalysis] Auto-escalated conversation', {
        conversationId,
        escalated: true,
    })
}
