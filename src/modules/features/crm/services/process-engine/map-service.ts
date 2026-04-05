import { supabaseAdmin } from "@/lib/supabase-admin"
import { PipelineProcessMap } from "@/types/process-engine"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

export class ProcessMapper {

    /**
     * Get the Process State linked to a Pipeline Stage
     */
    static async getProcessStateForStage(stageId: string): Promise<PipelineProcessMap | null> {
        const { data, error } = await supabaseAdmin
            .from('pipeline_process_map')
            .select('*')
            .eq('pipeline_stage_id', stageId)
            .single()

        if (error) return null
        return data as PipelineProcessMap
    }

    /**
     * Check if a Pipeline move is valid regarding the Process Engine
     * Returns true if valid/allowed, or error message.
     */
    static async validatePipelineMove(leadId: string, targetStageId: string): Promise<{ allowed: boolean, reason?: string, requiredProcessState?: string }> {
        const orgId = await getCurrentOrganizationId()
        if (!orgId) return { allowed: true } // No org context, permissive (or strict?) -> Permissive for legacy

        // 1. Does the target stage map to a Process State?
        const mapping = await this.getProcessStateForStage(targetStageId)

        if (!mapping) {
            // Target stage is "Unmapped" (Legacy/Free).
            // Should we allow leads WITH processes to enter unmapped stages?
            // "Partially governed" -> Maybe. For now, yes.
            return { allowed: true }
        }

        // 2. Does the lead have an active process of this type?
        const { data: processInstance } = await supabaseAdmin
            .from('process_instances')
            .select('*')
            .eq('lead_id', leadId)
            .eq('type', mapping.process_type)
            .eq('status', 'active')
            .single()

        if (!processInstance) {
            // No active process.
            // Option A: Auto-start process?
            // Option B: Allow?
            // If the stage REQUIRES a state, and we don't have a process, maybe we should auto-start?
            // For Phase 1, let's say "No active process = Permissive" (Legacy Mode)
            return { allowed: true }
        }

        // 3. Evaluate Transition
        const currentProcessState = processInstance.current_state
        const targetProcessState = mapping.process_state_key

        if (currentProcessState === targetProcessState) {
            return { allowed: true } // Already there
        }

        // Check rules
        const { data: currentStateDef } = await supabaseAdmin
            .from('process_states')
            .select('allowed_next_states')
            .eq('organization_id', orgId)
            .eq('type', mapping.process_type)
            .eq('key', currentProcessState)
            .single()

        if (!currentStateDef) return { allowed: false, reason: "Current process state definition missing" }

        if (currentStateDef.allowed_next_states?.includes(targetProcessState)) {
            return { allowed: true, requiredProcessState: targetProcessState }
        }

        return {
            allowed: false,
            reason: `Process Rules prevent moving from '${currentProcessState}' to '${targetProcessState}'.`,
            requiredProcessState: targetProcessState
        }
    }
}
