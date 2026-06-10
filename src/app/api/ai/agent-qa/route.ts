import { NextRequest, NextResponse } from 'next/server'
import { analyzeAgentPerformance } from '@/modules/features/messaging/messaging-actions'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'

const DEFAULT_MESSAGE_LIMIT = 50
const MAX_MESSAGE_LIMIT = 100

export async function POST(req: NextRequest) {
    try {
        const { agentId, messageLimit = DEFAULT_MESSAGE_LIMIT } = await req.json()

        if (typeof agentId !== 'string' || !agentId.trim()) {
            return NextResponse.json(
                { success: false, error: 'agentId is required' },
                { status: 400 }
            )
        }

        if (!Number.isInteger(messageLimit) || messageLimit < 1 || messageLimit > MAX_MESSAGE_LIMIT) {
            return NextResponse.json(
                { success: false, error: `messageLimit must be between 1 and ${MAX_MESSAGE_LIMIT}` },
                { status: 400 }
            )
        }

        const orgId = await getCurrentOrganizationId()
        if (!orgId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const result = await analyzeAgentPerformance(agentId.trim(), messageLimit)

        return NextResponse.json(result)

    } catch (error: any) {
        console.error('[Agent QA API] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
