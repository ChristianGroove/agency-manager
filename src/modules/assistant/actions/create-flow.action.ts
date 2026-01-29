
import { AssistantContext, AssistantAction, AssistantResult } from "../types";
import { FlowEngine } from "@/modules/flows/services/flow-engine";
import { FlowTemplate } from "@/modules/flows/types";
// In a real app we'd fetch templates from DB. For Phase 1 we might need to mock fetching the template if no service exists.

// Mock Template fetcher (Self-contained for Phase 1 stability)
async function getFlowTemplate(id: string): Promise<FlowTemplate | null> {
    // This would match the ID passed in params
    if (id === 'tpl_onboarding_v1') {
        return {
            id: 'tpl_onboarding_v1',
            key: 'onboarding_standard',
            name: 'Onboarding Nuevo Cliente',
            description: 'Secuencia estándar de bienvenida',
            icon: 'Rocket',
            category: 'sales',
            definition: { steps: [] }
        };
    }
    return null;
}

export const CreateFlowAction: AssistantAction = {
    name: "create_flow_from_template",
    description: "Crea una nueva rutina automatizada desde una plantilla",
    required_permissions: ['flows.create'],
    execute: async (ctx: AssistantContext, params: any): Promise<AssistantResult> => {
        if (!params.template_id) {
            return { success: false, narrative_log: "Necesito el ID de la plantilla." };
        }

        try {
            // 1. Get Template
            const template = await getFlowTemplate(params.template_id);
            if (!template) {
                return { success: false, narrative_log: `No encontré la plantilla '${params.template_id}'.` };
            }

            // 2. Instantiate
            // Using the Engine directly as an isolated module service
            const routine = await FlowEngine.createRoutineFromTemplate(
                template,
                ctx.tenant_id,
                ctx.space_id,
                params.custom_values || {}
            );

            return {
                success: true,
                narrative_log: `✅ Rutina "${routine.name}" creada y activada correctamente.`,
                data: routine
            };

        } catch (e: any) {
            return {
                success: false,
                narrative_log: `Error al crear el flujo: ${e.message}`
            };
        }
    }
};
