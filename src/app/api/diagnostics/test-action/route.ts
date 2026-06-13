import { requireProductionInternalAccess } from "@/app/api/_guards/request-guards"
import { NextResponse } from "next/server"
import { updateConversationState } from "@/modules/features/messaging/conversation-management-actions"
import { createClient } from "@/modules/core/database/supabase-server";

export async function GET(req: Request) {
    const guard = requireProductionInternalAccess(req)
    if (guard) return guard;

    // First get any conversation ID to test with
    const { data: conversations, error: fetchError } = await (await createClient())
        .from('conversations')
        .select('id, state')
        .limit(1)

    if (fetchError) {
        return NextResponse.json({
            error: 'Failed to fetch conversations',
            details: fetchError
        }, { status: 500 })
    }

    if (!conversations || conversations.length === 0) {
        return NextResponse.json({
            error: 'No conversations found to test with'
        }, { status: 404 })
    }

    const testConvId = conversations[0].id
    const currentState = conversations[0].state

    console.log('[TEST] Testing updateConversationState with:', testConvId)

    // Try the update
    try {
        const result = await updateConversationState(testConvId, { state: 'archived' })

        return NextResponse.json({
            testConversationId: testConvId,
            previousState: currentState,
            actionResult: result
        })
    } catch (err: any) {
        return NextResponse.json({
            error: 'Exception in action',
            message: err.message,
            stack: err.stack
        }, { status: 500 })
    }
}
