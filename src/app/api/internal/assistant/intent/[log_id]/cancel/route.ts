
import { NextRequest, NextResponse } from 'next/server';
import { resolveAssistantContext } from '@/modules/assistant/context-resolver';
import { IntentExecutor } from '@/modules/assistant/intent-executor';

/**
 * 🔒 CANCEL INTENT API
 * Path: /api/internal/assistant/intent/[log_id]/cancel
 * 
 * Cancels a proposed intent.
 * Strict ownership and state validation.
 */
export async function POST(
    req: NextRequest,
    props: { params: Promise<{ log_id: string }> }
) {
    const params = await props.params;

    // 1. Resolve Context
    const resolution = await resolveAssistantContext();
    if (!resolution) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { context, supabase } = resolution;

    const logId = params.log_id;

    if (!logId) {
        return NextResponse.json({ error: 'Missing log_id' }, { status: 400 });
    }

    try {
        // 2. Delegate to Executor
        // 2. Delegate to Executor
        const result = await IntentExecutor.cancel(logId, context, supabase);

        // 3. Return Structured Decision (Voice Gateway Contract)
        return NextResponse.json({
            message: result.message || "Acción cancelada.",
            requires_confirmation: false, // Cancellation is final
            intent_log_id: logId
        });

    } catch (error: any) {
        console.error("[Assistant API] Cancellation Error:", error);

        if (error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        if (error.message.includes("Cannot cancel")) {
            return NextResponse.json({ error: error.message }, { status: 409 });
        }

        return NextResponse.json(
            { error: 'Cancellation Failed', details: error.message },
            { status: 500 }
        );
    }
}
