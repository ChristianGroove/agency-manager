import { NextResponse } from 'next/server'
import { analyzeSentiment, saveSentimentAnalysis, autoEscalateIfNeeded } from '@/modules/core/messaging/ai/sentiment-analysis'
import { detectIntent, saveIntent, applyIntentRouting } from '@/modules/core/messaging/ai/intent-detection'
import { getCurrentOrganizationId } from '@/modules/core/organizations/actions'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { messageContent, conversationId, messageId, organizationId } = body

        if (!messageContent || !conversationId || !messageId) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
        }

        // Run analysis in parallel
        const [sentimentResult, intentResult] = await Promise.all([
            analyzeSentiment(messageContent),
            detectIntent(messageContent)
        ])

        // Process Results (Fire and Forget or await?)
        // We await to ensure data integrity for this API call

        if (sentimentResult.success && sentimentResult.result) {
            await saveSentimentAnalysis(messageId, conversationId, sentimentResult.result)
            await autoEscalateIfNeeded(conversationId, sentimentResult.result)
        }

        if (intentResult.success && intentResult.result) {
            await saveIntent(conversationId, messageId, intentResult.result)

            // If organizationId is provided (it should be for routing), apply routing
            if (organizationId || body.orgId) {
                const orgId = organizationId || body.orgId
                await applyIntentRouting(
                    conversationId,
                    orgId,
                    intentResult.result.intent,
                    intentResult.result.confidence
                )
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                sentiment: sentimentResult.result,
                intent: intentResult.result
            }
        })

    } catch (error: any) {
        console.error("[AI Analyze API] Error:", error)
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
