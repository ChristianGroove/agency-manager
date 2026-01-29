
import { AssistantContext } from "../../types";
import { createClient } from "@/lib/supabase-server";

/**
 * LIST ACTIVE FLOWS ACTION
 * 
 * Read-only action to fetch active automations.
 */
export async function listActiveFlowsAction(
    params: any,
    context: AssistantContext,
    injectedClient?: any
) {
    const supabase = injectedClient || await createClient();

    // In a real implementation:
    // const { data } = await supabase.from('flow_routines').select('*').eq('space_id', context.space_id).eq('status', 'active');

    // For Phase 3 without full FlowDB, we return a mocked structure 
    // designed to be read by the Voice/Chat interface later.

    const mockFlows = [
        { id: 'flow_1', name: 'Cobrador Amable', status: 'active', triggers: ['invoice_overdue'] },
        { id: 'flow_2', name: 'Onboarding Nuevo Cliente', status: 'active', triggers: ['client_signed'] }
    ];

    return {
        success: true,
        count: mockFlows.length,
        flows: mockFlows,
        message: `Hay ${mockFlows.length} flujos activos en este espacio.`
    };
}
