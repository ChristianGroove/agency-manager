import { NextRequest, NextResponse } from 'next/server'
import { extractFAQ } from '@/modules/core/messaging/ai/knowledge-extractor'

export async function POST(req: NextRequest) {
    try {
        const { conversationText } = await req.json()

        if (!conversationText) {
            return NextResponse.json(
                { success: false, error: 'conversationText is required' },
                { status: 400 }
            )
        }

        const result = await extractFAQ(conversationText)

        return NextResponse.json(result)

    } catch (error: any) {
        console.error('[Extract FAQ API] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
