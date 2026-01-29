
import { AssistantContext, AssistantAction, AssistantResult } from "./types";
import { SYSTEM_INTENTS } from "./intent-registry";

// -- Action Implementations --
import { CreateBriefAction } from "./actions/create-brief.action";
import { CreateQuoteAction } from "./actions/create-quote.action";
import { SendPaymentReminderAction } from "./actions/send-payment-reminder.action";
import { ListPendingActions } from "./actions/list-pending.action";
import { CreateFlowAction } from "./actions/create-flow.action";

const CreateClientAction: AssistantAction = {
    name: "create_client_prospect",
    description: "Crea un nuevo prospecto de cliente",
    required_permissions: ['clients.create'],
    execute: async (ctx: AssistantContext, params: any): Promise<AssistantResult> => {
        // Validation
        if (!params.name) {
            return {
                success: false,
                narrative_log: "No puedo crear el contacto. Falta el nombre del cliente."
            };
        }

        // Logic (Simulated for Phase 0 if import is tricky, or dynamic import)
        try {
            const { quickCreateProspect } = await import("@/modules/core/clients/actions");

            // Ensure ctx.user_id is valid
            if (!ctx.user_id) throw new Error("No user ID in context");

            const result = await quickCreateProspect({
                name: params.name,
                email: params.email, // Optional
                userId: ctx.user_id
            });

            if (result.success) {
                return {
                    success: true,
                    narrative_log: `✅ He creado el prospecto "${params.name}" exitosamente.`,
                    data: result.client
                };
            } else {
                throw new Error(result.error);
            }

        } catch (e: any) {
            return {
                success: false,
                narrative_log: `Tuve un problema creando el contacto: ${e.message}`
            };
        }
    }
};

// -- Registry Map --

export const ACTION_REGISTRY: Record<string, AssistantAction> = {
    [SYSTEM_INTENTS.CREATE_CLIENT]: CreateClientAction,
    [SYSTEM_INTENTS.CREATE_BRIEF]: CreateBriefAction,
    [SYSTEM_INTENTS.CREATE_QUOTE]: CreateQuoteAction,
    [SYSTEM_INTENTS.SEND_PAYMENT_REMINDER]: SendPaymentReminderAction,
    [SYSTEM_INTENTS.LIST_PENDING_ACTIONS]: ListPendingActions,
    [SYSTEM_INTENTS.CREATE_FLOW_FROM_TEMPLATE]: CreateFlowAction,
};

export function getActionForIntent(intentName: string): AssistantAction | null {
    return ACTION_REGISTRY[intentName] || null;
}
