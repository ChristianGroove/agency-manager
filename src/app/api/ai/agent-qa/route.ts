import { NextRequest, NextResponse } from 'next/server'
import { analyzeAgentPerformance } from '@/modules/features/messaging/messaging-actions'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'
import { aiRouteErrorMessage, logAiRouteError } from '../_error-utils'

const DEFAULT_MESSAGE_LIMIT = 50
const MAX_MESSAGE_LIMIT = 100
const PUBLIC_AGENT_QA_ERROR = 'Agent QA failed'

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
        if (!result.success) {
            logAiRouteError('[Agent QA API] Analysis failed:', result.error)
            return NextResponse.json({
                ...result,
                error: aiRouteErrorMessage(result.error, PUBLIC_AGENT_QA_ERROR),
            })
        }

        return NextResponse.json(result)

    } catch (error: any) {
        logAiRouteError('[Agent QA API] Error:', error)
        return NextResponse.json(
            { success: false, error: aiRouteErrorMessage(error, PUBLIC_AGENT_QA_ERROR) },
            { status: 500 }
        )
    }
}
