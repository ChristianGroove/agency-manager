
import { AssistantContext } from "./types";
import { createClient } from "@/lib/supabase-server";

/**
 * INTENT EXECUTOR SERVICE (Phase 2)
 * 
 * Strict execution engine for confirmed intents.
 * - Idempotency Enforcement (check 'executed' status)
 * - Status Transition (confirmed -> executed | failed)
 * - Action Delegation
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ... imports

/**
 * INTENT EXECUTOR SERVICE (Phase 2)
 * 
 * Strict execution engine for confirmed intents.
 * Uses Service Role for Log Management (bypassing RLS on logs),
 * but User Context for Action Execution.
 */
export class IntentExecutor {

    private static getAdminClient() {
        return createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }

    /**
     * EXECUTE CONFIRMED INTENT
     */
    static async execute(
        logId: string,
        context: AssistantContext,
        injectedClient?: any
    ): Promise<any> {
        const userSupabase = injectedClient || await createClient();
        const adminSupabase = this.getAdminClient();

        // 1. Get Log & Lock (Admin)
        const { data: log, error } = await adminSupabase
            .from('assistant_intent_logs')
            .select('*')
            .eq('id', logId)
            .single();

        if (error || !log) throw new Error("Intent Log not found.");

        // 2. Validate Ownership (Security)
        if (log.user_id !== context.user_id) {
            throw new Error("Unauthorized execution attempt: User mismatch.");
        }

        if (log.space_id !== context.space_id) {
            throw new Error("Unauthorized execution attempt: Space mismatch.");
        }

        // 3. Idempotency Check
        if (log.status === 'executed') {
            console.log(`[EXEC] Idempotency Hit: ${logId}`);
            return log.metadata?.result || { message: "Optimistic Idempotency: Already Executed" };
        }

        // 4. Strict Status Check
        if (log.status !== 'confirmed') {
            throw new Error(`Intent cannot be executed. Current status: '${log.status}'. Required: 'confirmed'.`);
        }

        // 5. Switch & Execute (USER CONTEXT)
        let result;
        try {
            switch (log.intent_id) {
                case 'create_brief':
                    const { createBriefAction } = await import("./actions/createBrief.action");
                    result = await createBriefAction(log.payload, context, userSupabase);
                    break;

                case 'send_payment_reminder':
                    const { sendPaymentReminderAction } = await import("./actions/sendPaymentReminder.action");
                    result = await sendPaymentReminderAction(log.payload, context, userSupabase);
                    break;

                // PHASE 3: FLOWS
                case 'activate_flow':
                    const { activateFlowAction } = await import("./actions/flows/activateFlow.action");
                    result = await activateFlowAction(log.payload, context, userSupabase);
                    break;

                case 'pause_flow':
                    const { pauseFlowAction } = await import("./actions/flows/pauseFlow.action");
                    result = await pauseFlowAction(log.payload, context, userSupabase);
                    break;

                case 'run_flow_once':
                    const { runFlowOnceAction } = await import("./actions/flows/runFlowOnce.action");
                    result = await runFlowOnceAction(log.payload, context, userSupabase);
                    break;

                case 'list_active_flows':
                    const { listActiveFlowsAction } = await import("./actions/flows/listActiveFlows.action");
                    result = await listActiveFlowsAction(log.payload, context, userSupabase);
                    break;

                default:
                    throw new Error(`No adapter found for intent: ${log.intent_id}`);
            }

            // 6. Success -> Update Log (Admin)
            const { error: updateError } = await adminSupabase.from('assistant_intent_logs')
                .update({
                    status: 'executed',
                    metadata: { ...log.metadata, result: result, executed_at: new Date().toISOString() }
                })
                .eq('id', logId);

            if (updateError) {
                console.error("CRITICAL: Failed to update execution status", updateError);
            }

            return {
                intent_id: log.intent_id,
                status: 'executed',
                result: result
            };

        } catch (execError: any) {
            // 7. Failure -> Update Log (Admin)
            console.error(`[EXEC] Failed: ${execError.message}`);
            await adminSupabase.from('assistant_intent_logs')
                .update({
                    status: 'failed',
                    metadata: { ...log.metadata, error: execError.message, failed_at: new Date().toISOString() }
                })
                .eq('id', logId);

            throw execError;
        }
    }

    /**
     * CONFIRM & EXECUTE
     */
    static async confirm(
        logId: string,
        context: AssistantContext,
        injectedClient?: any
    ): Promise<any> {
        const userSupabase = injectedClient || await createClient();
        const adminSupabase = this.getAdminClient();

        // 1. Get Log (Admin)
        const { data: log, error } = await adminSupabase
            .from('assistant_intent_logs')
            .select('status, user_id, space_id')
            .eq('id', logId)
            .single();

        if (error || !log) throw new Error("Intent Log not found.");

        // 2. Security Check (CRITICAL)
        if (log.user_id !== context.user_id) throw new Error("Unauthorized execution attempt.");

        // 3. Status Transition (Admin)
        if (log.status === 'proposed') {
            const { error: updateError } = await adminSupabase
                .from('assistant_intent_logs')
                .update({ status: 'confirmed' }) // updated_at removed for safety
                .eq('id', logId);

            if (updateError) throw new Error("Failed to confirm intent.");
        } else if (log.status !== 'confirmed' && log.status !== 'executed') {
            throw new Error(`Cannot confirm intent in state: ${log.status}`);
        }

        // 4. Execute (Pass User Client)
        return this.execute(logId, context, userSupabase);
    }

    /**
     * CANCEL INTENT
     */
    static async cancel(
        logId: string,
        context: AssistantContext,
        injectedClient?: any
    ) {
        const adminSupabase = this.getAdminClient();

        // 1. Get Log (Admin)
        const { data: log, error } = await adminSupabase
            .from('assistant_intent_logs')
            .select('*')
            .eq('id', logId)
            .single();

        if (error || !log) throw new Error("Intent Log not found.");

        // 2. Validate Ownership
        if (log.user_id !== context.user_id) throw new Error("Unauthorized.");

        // 3. Status Check
        if (log.status !== 'proposed') {
            throw new Error(`Cannot cancel intent in '${log.status}' state. Only 'proposed' intents can be cancelled.`);
        }

        // 4. Update (Admin)
        const { data } = await adminSupabase.from('assistant_intent_logs')
            .update({
                status: 'cancelled',
                metadata: { ...log.metadata, cancelled_at: new Date().toISOString(), cancelled_by: context.user_id }
            })
            .eq('id', logId)
            .select()
            .single();

        return {
            intent_id: log.intent_id,
            status: 'cancelled',
            message: "Intention cancelled successfully."
        };
    }
}
