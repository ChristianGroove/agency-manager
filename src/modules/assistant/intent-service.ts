import { AssistantContext, AssistantResult } from "./types";
import { IntentValidator } from "./intent-validator";
import { getIntentDefinition } from "./intent-registry";
import { createClient } from "@/lib/supabase-server";

export type IntentProposal = {
    status: 'proposed' | 'confirmed' | 'rejected';
    intent_id: string;
    risk_level: 'low' | 'medium' | 'high';
    requires_confirmation: boolean;
    message: string;
    log_id?: string;
};

export class IntentService {

    /**
     * Propose an intent for execution.
     * Does NOT execute. Only validates and logs.
     */
    static async proposeIntent(
        intentId: string,
        params: any,
        context: AssistantContext,
        injectedClient?: any // For testing/DI
    ): Promise<IntentProposal> {

        // 1. Validate
        const validation = IntentValidator.validate(intentId, context);
        const def = getIntentDefinition(intentId);

        if (!validation.valid || !def) {
            // Log rejection
            await this.auditLog(intentId, context, 'rejected', params, 'high', { reason: validation.reason }, injectedClient);

            return {
                status: 'rejected',
                intent_id: intentId,
                risk_level: 'high',
                requires_confirmation: false,
                message: validation.reason || "Intención no válida."
            };
        }

        // 2. Determine Status
        // If high risk OR strict definition says so -> Proposed (needs confirm)
        // If low risk AND def says no confirm -> Confirmed (ready to execute)

        let status: 'proposed' | 'confirmed' = 'proposed';
        if (!def.requires_confirmation && def.risk_level === 'low') {
            status = 'confirmed';
        }

        // 3. Log Proposal
        const logId = await this.auditLog(intentId, context, status, params, def.risk_level, {}, injectedClient);

        return {
            status: status,
            intent_id: intentId,
            risk_level: def.risk_level,
            requires_confirmation: status === 'proposed',
            message: status === 'proposed'
                ? `Confirmar ejecución de: ${def.name}`
                : `Preparado para ejecutar: ${def.name}`,
            log_id: logId
        };
    }

    /**
     * EXECUTE INTENT (Idempotent)
     * 
     * 1. Check Log Status (Source of Truth)
     * 2. If already executed -> Return cached result (Idempotency)
     * 3. If not confirmed -> Reject
     * 4. Execute specific Action Adapter
     * 5. Update Log -> executed | failed
     */
    // executeIntent has been moved to IntentExecutor (Phase 2)

    private static async auditLog(
        intentId: string,
        context: AssistantContext,
        status: string,
        payload: any,
        riskLevel: string,
        metadata: any = {},
        injectedClient?: any
    ): Promise<string> {
        const supabase = injectedClient || await createClient();

        const { data, error } = await supabase.from('assistant_intent_logs').insert({
            intent_id: intentId,
            user_id: context.user_id,
            space_id: context.space_id,
            organization_id: context.tenant_id,
            status: status,
            payload: payload,
            risk_level: riskLevel,
            metadata: metadata
        }).select('id').single();

        if (error) {
            console.error("CRITICAL: Failed to audit intent log", error);
            console.error("CRITICAL: Failed to audit intent log", error);
            return `audit-failed: ${error.message} (${error.details})`;
        }
        return data?.id;
    }
}
