
import { AssistantContext, AssistantAction, AssistantResult } from "../types";
import { createFormSubmission } from "@/modules/core/forms/actions";

export const CreateBriefAction: AssistantAction = {
    name: "create_brief",
    description: "Crea un nuevo briefing (formulario) para un cliente",
    required_permissions: ['forms.create'], // Mapping to conceptual permission
    execute: async (ctx: AssistantContext, params: any): Promise<AssistantResult> => {
        // 1. Validation
        if (!params.client_id) {
            return {
                success: false,
                narrative_log: "No puedo crear el brief porque falta identificar el cliente."
            };
        }
        if (!params.template_id) {
            return {
                success: false,
                narrative_log: "Necesito saber qué plantilla de brief usar."
            };
        }

        // 2. Execution
        try {
            const result = await createFormSubmission(params.template_id, params.client_id);

            return {
                success: true,
                narrative_log: `✅ Brief creado exitosamente. Estado: Borrador.`,
                data: result
            };
        } catch (e: any) {
            return {
                success: false,
                narrative_log: `Error creando el brief: ${e.message}`
            };
        }
    }
};
