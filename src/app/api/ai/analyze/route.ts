import { NextResponse } from 'next/server'
import { analyzeSentiment, saveSentimentAnalysis, autoEscalateIfNeeded } from '@/modules/features/messaging/messaging-actions'
import { detectIntent, saveIntent, applyIntentRouting } from '@/modules/features/messaging/messaging-actions'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'
import { createClient } from '@/modules/core/database/supabase-server'

const MAX_MESSAGE_CONTENT_LENGTH = 12_000

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { messageContent, conversationId, messageId } = body

        if (
            typeof messageContent !== 'string' ||
            typeof conversationId !== 'string' ||
            typeof messageId !== 'string' ||
            !messageContent.trim() ||
            !conversationId.trim() ||
            !messageId.trim()
        ) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
        }

        if (messageContent.length > MAX_MESSAGE_CONTENT_LENGTH) {
            return NextResponse.json({ success: false, error: "Message content is too long" }, { status: 413 })
        }

        const orgId = await getCurrentOrganizationId()
        if (!orgId) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
        }

        const supabase = await createClient()
        const { data: conversation, error: conversationError } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', conversationId)
            .eq('organization_id', orgId)
            .single()

        if (conversationError || !conversation) {
            return NextResponse.json({ success: false, error: "Conversation not found" }, { status: 404 })
        }

        const { data: message, error: messageError } = await supabase
            .from('messages')
            .select('id')
            .eq('id', messageId)
            .eq('conversation_id', conversationId)
            .eq('organization_id', orgId)
            .single()

        if (messageError || !message) {
            return NextResponse.json({ success: false, error: "Message not found" }, { status: 404 })
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

            await applyIntentRouting(
                conversationId,
                orgId,
                intentResult.result.intent,
                intentResult.result.confidence
            )
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

