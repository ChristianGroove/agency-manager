import { NextRequest, NextResponse } from 'next/server'
import { extractFAQ } from '@/modules/features/messaging/messaging-actions'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'
import { aiRouteErrorMessage, logAiRouteError } from '../_error-utils'

const MAX_CONVERSATION_TEXT_LENGTH = 20_000
const PUBLIC_EXTRACT_FAQ_ERROR = 'FAQ extraction failed'

export async function POST(req: NextRequest) {
    try {
        const { conversationText } = await req.json()

        if (typeof conversationText !== 'string' || !conversationText.trim()) {
            return NextResponse.json(
                { success: false, error: 'conversationText is required' },
                { status: 400 }
            )
        }

        if (conversationText.length > MAX_CONVERSATION_TEXT_LENGTH) {
            return NextResponse.json(
                { success: false, error: 'conversationText is too long' },
                { status: 413 }
            )
        }

        const orgId = await getCurrentOrganizationId()
        if (!orgId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const result = await extractFAQ(conversationText.trim())
        if (!result.success) {
            logAiRouteError('[Extract FAQ API] Extraction failed:', result.error)
            return NextResponse.json({
                ...result,
                error: aiRouteErrorMessage(result.error, PUBLIC_EXTRACT_FAQ_ERROR),
            })
        }

        return NextResponse.json(result)

    } catch (error: any) {
        logAiRouteError('[Extract FAQ API] Error:', error)
        return NextResponse.json(
            { success: false, error: aiRouteErrorMessage(error, PUBLIC_EXTRACT_FAQ_ERROR) },
            { status: 500 }
        )
    }
}
