
import { NextRequest, NextResponse } from 'next/server';
import { resolveAssistantContext } from '@/modules/assistant/context-resolver';
import { IntentExecutor } from '@/modules/assistant/intent-executor';

/**
 * 🔒 CONFIRM INTENT API
 * Path: /api/internal/assistant/intent/[log_id]/confirm
 * 
 * Executes a previously proposed intent.
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
        const result = await IntentExecutor.confirm(logId, context, supabase);

        // 3. Return Structured Decision (Voice Gateway Contract)
        return NextResponse.json({
            message: result.result?.message || result.message || "Acción completada.",
            requires_confirmation: false, // Execution is final
            intent_log_id: logId
        });

    } catch (error: any) {
        console.error("[Assistant API] Confirmation Error:", error);

        // Handle Logic Errors cleanly
        if (error.message.includes("Unauthorized") || error.message.includes("mismatch")) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        if (error.message.includes("cannot be executed")) {
            return NextResponse.json({ error: error.message }, { status: 409 }); // Conflict
        }
        if (error.message.includes("not found")) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json(
            { error: 'Execution Failed', details: error.message },
            { status: 500 }
        );
    }
}
