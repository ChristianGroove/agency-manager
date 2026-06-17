import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/modules/core/database/supabase-server'
import { AIEngine } from '@/modules/infrastructure/ai-engine/service'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'
import { aiRouteErrorMessage, logAiRouteError } from '../_error-utils'

const MAX_VOICE_TEXT_LENGTH = 20_000
const PUBLIC_VOICE_ANALYSIS_ERROR = 'Voice analysis failed'

export async function POST(req: NextRequest) {
    try {
        const { messageId, text } = await req.json()

        if (
            (messageId !== undefined && (typeof messageId !== 'string' || !messageId.trim())) ||
            (text !== undefined && (typeof text !== 'string' || !text.trim()))
        ) {
            return NextResponse.json(
                { success: false, error: 'messageId and text must be non-empty strings when provided' },
                { status: 400 }
            )
        }

        if (!messageId && !text) {
            return NextResponse.json(
                { success: false, error: 'messageId or text required' },
                { status: 400 }
            )
        }

        if (typeof text === 'string' && text.length > MAX_VOICE_TEXT_LENGTH) {
            return NextResponse.json(
                { success: false, error: 'text is too long' },
                { status: 413 }
            )
        }

        const orgId = await getCurrentOrganizationId()
        if (!orgId) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
        }

        const normalizedMessageId = typeof messageId === 'string' ? messageId.trim() : undefined
        let transcription = typeof text === 'string' ? text.trim() : undefined
        const supabase = await createClient()
        let currentMetadata: Record<string, any> | undefined

        if (normalizedMessageId) {
            const { data: msg, error: messageError } = await supabase
                .from('messages')
                .select('metadata, conversation_id')
                .eq('id', normalizedMessageId)
                .eq('organization_id', orgId)
                .single()

            if (messageError || !msg?.conversation_id) {
                return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 })
            }

            const { data: conversation, error: conversationError } = await supabase
                .from('conversations')
                .select('id')
                .eq('id', msg.conversation_id)
                .eq('organization_id', orgId)
                .single()

            if (conversationError || !conversation) {
                return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 })
            }

            currentMetadata = (msg.metadata || {}) as Record<string, any>
            transcription = transcription || currentMetadata.transcription
        }

        if (!transcription) {
            return NextResponse.json(
                { success: false, error: 'No transcription found' },
                { status: 404 }
            )
        }

        // Execute AI Analysis
        const aiResponse = await AIEngine.executeTask({
            organizationId: orgId,
            taskType: 'media.analyze_voice_v1',
            payload: { text: transcription }
        })

        if (!aiResponse.success || !aiResponse.data) {
            throw new Error(aiResponse.error || 'AI Analysis failed')
        }

        const analysis = aiResponse.data

        // Save Analysis to Message Metadata if messageId exists
        if (normalizedMessageId) {
            const newMetadata = {
                ...(currentMetadata || {}),
                voice_analysis: {
                    ...analysis,
                    analyzed_at: new Date().toISOString()
                }
            }

            await supabase
                .from('messages')
                .update({ metadata: newMetadata })
                .eq('id', normalizedMessageId)
                .eq('organization_id', orgId)
        }

        return NextResponse.json({
            success: true,
            analysis
        })

    } catch (error: unknown) {
        logAiRouteError('[VoiceAnalysis API] Error:', error)
        return NextResponse.json(
            { success: false, error: aiRouteErrorMessage(error, PUBLIC_VOICE_ANALYSIS_ERROR) },
            { status: 500 }
        )
    }
}

