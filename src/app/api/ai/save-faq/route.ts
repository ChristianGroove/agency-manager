import { NextRequest, NextResponse } from 'next/server'
import { saveFAQ } from '@/modules/core/messaging/ai/knowledge-extractor'

export async function POST(req: NextRequest) {
    try {
        const faq = await req.json()

        if (!faq.question || !faq.answer) {
            return NextResponse.json(
                { success: false, error: 'question and answer are required' },
                { status: 400 }
            )
        }

        const result = await saveFAQ(faq)

        return NextResponse.json(result)

    } catch (error: any) {
        console.error('[Save FAQ API] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
