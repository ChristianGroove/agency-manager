
import { AssistantContext } from "../../types";
import { FlowEngine } from "@/modules/flows/services/flow-engine";

/**
 * PAUSE FLOW ACTION
 * 
 * Switches a flow routine status to 'paused'.
 */
export async function pauseFlowAction(
    params: { flow_id: string },
    context: AssistantContext,
    injectedClient?: any
) {
    console.log(`[ACTION] Pausing Flow ${params.flow_id} for User ${context.user_id}`);

    const result = await FlowEngine.updateStatus(params.flow_id, 'paused');

    return {
        success: result.success,
        flow_id: params.flow_id,
        new_status: 'paused',
        message: `Flujo ${params.flow_id} pausado correctamente.`
    };
}
