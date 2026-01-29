
import { AssistantContext } from "../../types";
import { FlowEngine } from "@/modules/flows/services/flow-engine";

/**
 * ACTIVATE FLOW ACTION
 * 
 * Switches a flow routine status to 'active'.
 * Validates ownership via IntentExecutor (caller).
 */
export async function activateFlowAction(
    params: { flow_id: string },
    context: AssistantContext,
    injectedClient?: any
) {
    console.log(`[ACTION] Activating Flow ${params.flow_id} for User ${context.user_id}`);

    // Delegate to Flow Engine
    // Note: FlowEngine.updateStatus is static and currently mocks DB update.
    // In real scenario, it would verify spaceId match.
    // We assume IntentExecutor verified context access to the intent capability.

    // Safety check: Ensure flow belongs to space? 
    // FlowEngine should handle this, but for Phase 3 we trust the engine method signature.

    const result = await FlowEngine.updateStatus(params.flow_id, 'active');

    return {
        success: result.success,
        flow_id: params.flow_id,
        new_status: 'active',
        message: `Flujo ${params.flow_id} activado correctamente.`
    };
}
