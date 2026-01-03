import { NextRequest, NextResponse } from 'next/server'
import { analyzeSentiment, analyzeKeywords, saveSentimentAnalysis, autoEscalateIfNeeded } from '@/modules/core/messaging/ai/sentiment-analysis'
import { detectIntent, detectIntentKeywords, saveIntent, applyIntentRouting } from '@/modules/core/messaging/ai/intent-detection'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
    try {
        const { messageId, conversationId, content, organizationId } = await req.json()

        if (!messageId || !conversationId || !content) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const useAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'

        // Run sentiment and intent detection in parallel
        const [sentimentResult, intentResult] = await Promise.all([
            useAI ? analyzeSentiment(content) : Promise.resolve({
                success: true,
                result: analyzeKeywords(content)
            }),
            useAI ? detectIntent(content) : Promise.resolve({
                success: true,
                result: detectIntentKeywords(content)
            })
        ])

        // Save results
        if (sentimentResult.success && sentimentResult.result) {
            await saveSentimentAnalysis(messageId, conversationId, sentimentResult.result)
            await autoEscalateIfNeeded(conversationId, sentimentResult.result)
        }

        if (intentResult.success && intentResult.result) {
            await saveIntent(conversationId, messageId, intentResult.result)

            if (organizationId && intentResult.result.confidence > 0.7) {
                await applyIntentRouting(
                    conversationId,
                    organizationId,
                    intentResult.result.intent,
                    intentResult.result.confidence
                )
            }
        }

        return NextResponse.json({
            success: true,
            sentiment: sentimentResult.result,
            intent: intentResult.result
        })
    } catch (error: any) {
        console.error('[AI Analysis API] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
