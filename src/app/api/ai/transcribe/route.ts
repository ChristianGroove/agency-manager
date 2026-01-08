import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio } from '@/modules/core/messaging/ai/transcription'

export async function POST(req: NextRequest) {
    try {
        const { audioUrl, messageId } = await req.json()

        if (!audioUrl) {
            return NextResponse.json(
                { success: false, error: 'audioUrl is required' },
                { status: 400 }
            )
        }

        const result = await transcribeAudio(audioUrl, messageId)

        return NextResponse.json(result)

    } catch (error: any) {
        console.error('[Transcribe API] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
