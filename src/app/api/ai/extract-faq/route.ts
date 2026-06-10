import { NextRequest, NextResponse } from 'next/server'
import { extractFAQ } from '@/modules/features/messaging/messaging-actions'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'

const MAX_CONVERSATION_TEXT_LENGTH = 20_000

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

        return NextResponse.json(result)

    } catch (error: any) {
        console.error('[Extract FAQ API] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
