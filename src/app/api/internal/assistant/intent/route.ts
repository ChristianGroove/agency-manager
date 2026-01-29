import { NextRequest, NextResponse } from 'next/server';
import { resolveAssistantContext } from '@/modules/assistant/context-resolver';
import { IntentService } from '@/modules/assistant/intent-service';

/**
 * 🔒 INTERNAL GOVERNANCE API
 * Path: /api/internal/assistant/intent
 * 
 * Strict Intent Proposal Endpoint.
 * - Authenticated (Supabase)
 * - Context Aware (Space/Role)
 * - No Execution (Proposal Only)
 */
export async function POST(req: NextRequest) {
    // 1. Resolve Context (Auth + Space Check)
    const resolution = await resolveAssistantContext();

    if (!resolution) {
        return NextResponse.json(
            { error: 'Unauthorized: Invalid Session or Space' },
            { status: 401 }
        );
    }
    const { context, supabase } = resolution;

    try {
        // 2. Validate Payload (Strict)
        const body = await req.json();
        const { intent_id, payload } = body;

        if (!intent_id || typeof intent_id !== 'string') {
            return NextResponse.json(
                { error: 'Invalid Request: intent_id is required' },
                { status: 400 }
            );
        }

        // 3. Propose Intent (Governance Layer)
        // Does NOT Execute. Only Validates & Logs.
        const proposal = await IntentService.proposeIntent(
            intent_id,
            payload || {}, // Default to empty params
            context,
            supabase // Inject authenticated client
        );

        // 4. Return Structured Decision (Voice Gateway Contract)
        return NextResponse.json({
            message: proposal.message,
            requires_confirmation: proposal.requires_confirmation,
            intent_log_id: proposal.log_id || null
        });

    } catch (error: any) {
        console.error("[Assistant API] Error proposing intent:", error);
        return NextResponse.json(
            { error: 'Internal Governance Error', details: error.message },
            { status: 500 }
        );
    }
}
