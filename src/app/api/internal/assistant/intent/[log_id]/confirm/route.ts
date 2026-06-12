
import { NextRequest, NextResponse } from 'next/server';
import { resolveAssistantContext } from '@/modules/assistant/context-resolver';
import { IntentExecutor } from '@/modules/assistant/intent-executor';
import { assistantIntentClientError, assistantIntentFailureBody, logAssistantIntentError } from '../../error-utils';

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

    } catch (error: unknown) {
        logAssistantIntentError("[Assistant API] Confirmation Error:", error);
        const errorMessage = error instanceof Error ? error.message : '';

        // Handle Logic Errors cleanly
        if (errorMessage.includes("Unauthorized") || errorMessage.includes("mismatch")) {
            return NextResponse.json({ error: assistantIntentClientError(error, 'Unauthorized') }, { status: 403 });
        }
        if (errorMessage.includes("cannot be executed")) {
            return NextResponse.json({ error: assistantIntentClientError(error, 'Intent cannot be executed') }, { status: 409 }); // Conflict
        }
        if (errorMessage.includes("not found")) {
            return NextResponse.json({ error: assistantIntentClientError(error, 'Intent not found') }, { status: 404 });
        }

        return NextResponse.json(
            assistantIntentFailureBody('Execution Failed', error),
            { status: 500 }
        );
    }
}
