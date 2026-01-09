import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { AIEngine } from '@/modules/core/ai-engine/service'
import { getCurrentOrganizationId } from '@/modules/core/organizations/actions'

export async function POST(req: NextRequest) {
    try {
        const { messageId, text } = await req.json()

        if (!messageId && !text) {
            return NextResponse.json(
                { success: false, error: 'messageId or text required' },
                { status: 400 }
            )
        }

        const orgId = await getCurrentOrganizationId()
        if (!orgId) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
        }

        let transcription = text
        const supabase = await createClient()

        // If no text provided, try to fetch from message metadata
        if (!transcription && messageId) {
            const { data: msg } = await supabase
                .from('messages')
                .select('metadata')
                .eq('id', messageId)
                .single()

            transcription = msg?.metadata?.transcription
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
        if (messageId) {
            const { data: currentMsg } = await supabase
                .from('messages')
                .select('metadata')
                .eq('id', messageId)
                .single()

            const currentMetadata = (currentMsg?.metadata || {}) as Record<string, any>
            const newMetadata = {
                ...currentMetadata,
                voice_analysis: {
                    ...analysis,
                    analyzed_at: new Date().toISOString()
                }
            }

            await supabase
                .from('messages')
                .update({ metadata: newMetadata })
                .eq('id', messageId)
        }

        return NextResponse.json({
            success: true,
            analysis
        })

    } catch (error: any) {
        console.error('[VoiceAnalysis API] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
