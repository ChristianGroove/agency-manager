
import { INTENT_REGISTRY, SYSTEM_INTENTS } from "../intent-registry";
import { ConversationState } from "./types";

export type ResolutionResult = {
    is_ready: boolean;
    missing_parameter?: string; // Phase 2: Simple one-at-a-time logic
    narrative_question?: string;
    should_confirm_now?: boolean;
}

export class IntentResolver {

    /**
     * Checks if the current conversation state has everything needed to execute.
     */
    static resolve(state: ConversationState): ResolutionResult {
        if (!state.active_intent) {
            return { is_ready: false };
        }

        const definition = INTENT_REGISTRY[state.active_intent];
        if (!definition) {
            return { is_ready: false, narrative_question: "Intención no registrada." };
        }

        // 1. Check Missing Parameters
        const collected = state.pending_parameters || {};
        const missing = definition.required_parameters.find(p => {
            const val = collected[p];
            return val === undefined || val === null || val === '';
        });

        if (missing) {
            return {
                is_ready: false,
                missing_parameter: missing,
                narrative_question: IntentResolver.generateQuestion(missing)
            };
        }

        // 2. Check Confirmation status
        // If ready but not confirmed yet, we signal engine to ask confirmation
        if (state.status !== 'waiting_confirmation' && definition.requires_confirmation) {
            return {
                is_ready: false,
                should_confirm_now: true,
                narrative_question: IntentResolver.generateConfirmation(state.active_intent, collected)
            };
        }

        // 3. Ready to Execute
        // If we are 'waiting_confirmation', checking 'is_ready' is trivial (handled by Engine's confirm logic)
        // But if we are here, it means we have params.

        return { is_ready: true };
    }

    private static generateQuestion(param: string): string {
        switch (param) {
            case 'client_id': return "¿Para qué cliente quieres realizar esta acción?";
            case 'name': return "¿Cómo se llamará el nuevo cliente?";
            case 'project_name': return "¿Cuál es el nombre del proyecto?";
            case 'invoice_id': return "¿Cuál es el número de la factura?";
            case 'items': return "¿Qué conceptos debo incluir en la cotización?";
            case 'template_id': return "¿Qué plantilla deseas usar?";
            default: return `Me falta un dato importante: ${param}. ¿Me lo indicas?`;
        }
    }

    private static generateConfirmation(intent: string, params: any): string {
        // Basic confirmation messages
        // In Phase 3, these can be richer templates
        // Human-friendly confirmation
        if (intent === 'create_brief') {
            return `Entendido. Prepararé un *brief* para el cliente **${params.client_id || 'nuevo'}** usando la plantilla **${params.template_id || 'estándar'}**. ¿Confirmas?`;
        }
        if (intent === 'pause_flow') {
            return `Entendido. Pausaré el flujo **#${params.flow_id}**. ¿Estás seguro?`;
        }

        // Fallback for generic intents
        return `Entendido. Voy a ejecutar **${intent}** con los datos proporcionados. ¿Confirmas?`;
    }
}
