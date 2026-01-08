import { NextRequest, NextResponse } from 'next/server'
import { analyzeAgentPerformance } from '@/modules/core/messaging/ai/agent-qa'

export async function POST(req: NextRequest) {
    try {
        const { agentId, messageLimit = 50 } = await req.json()

        if (!agentId) {
            return NextResponse.json(
                { success: false, error: 'agentId is required' },
                { status: 400 }
            )
        }

        const result = await analyzeAgentPerformance(agentId, messageLimit)

        return NextResponse.json(result)

    } catch (error: any) {
        console.error('[Agent QA API] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
