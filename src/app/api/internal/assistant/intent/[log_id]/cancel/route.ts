
import { NextRequest, NextResponse } from 'next/server';
import { resolveAssistantContext } from '@/modules/assistant/context-resolver';
import { IntentExecutor } from '@/modules/assistant/intent-executor';
import { assistantIntentClientError, assistantIntentFailureBody, logAssistantIntentError } from '../../error-utils';

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

    } catch (error: unknown) {
        logAssistantIntentError("[Assistant API] Cancellation Error:", error);
        const errorMessage = error instanceof Error ? error.message : '';

        if (errorMessage.includes("Unauthorized")) {
            return NextResponse.json({ error: assistantIntentClientError(error, 'Unauthorized') }, { status: 403 });
        }
        if (errorMessage.includes("Cannot cancel")) {
            return NextResponse.json({ error: assistantIntentClientError(error, 'Intent cannot be cancelled') }, { status: 409 });
        }

        return NextResponse.json(
            assistantIntentFailureBody('Cancellation Failed', error),
            { status: 500 }
        );
    }
}
