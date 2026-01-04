// "use server" removed partially

import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

interface SentimentResult {
    sentiment: 'positive' | 'neutral' | 'negative' | 'urgent'
    score: number // -1.0 to 1.0
    emotions: string[] // ['happy', 'frustrated', 'angry', etc.]
    urgentKeywords?: string[]
    needsEscalation: boolean
}

/**
 * Analyze sentiment of a message using OpenAI
 */
export async function analyzeSentiment(messageContent: string): Promise<{
    success: boolean
    result?: SentimentResult
    error?: string
}> {
    "use server"
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `You are a sentiment analysis expert. Analyze customer service messages and return sentiment analysis.

Sentiment levels:
- positive: Happy, satisfied, grateful
- neutral: Informational, question
- negative: Frustrated, disappointed, unhappy
- urgent: Angry, threatening, emergency, legal threat

Emotions to detect: happy, satisfied, grateful, neutral, curious, confused, frustrated, disappointed, angry, threatening, urgent

Urgent keywords: URGENT, ASAP, IMMEDIATELY, LAWYER, REFUND, CANCEL, UNACCEPTABLE, TERRIBLE, WORST

Return JSON:
{
  "sentiment": "positive|neutral|negative|urgent",
  "score": -1.0 to 1.0,
  "emotions": ["emotion1", "emotion2"],
  "urgentKeywords": ["KEYWORD"] (if any),
  "needsEscalation": boolean
}`
                },
                {
                    role: 'user',
                    content: `Analyze this message:\n\n"${messageContent}"`
                }
            ],
            temperature: 0.3,
            max_tokens: 200,
            response_format: { type: 'json_object' }
        })

        const responseText = completion.choices[0]?.message?.content
        if (!responseText) {
            return { success: false, error: 'No response from AI' }
        }

        const result: SentimentResult = JSON.parse(responseText)
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
