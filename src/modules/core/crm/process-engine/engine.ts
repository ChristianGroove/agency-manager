import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from "@/lib/supabase-admin"
import { ProcessInstance, ProcessState, ProcessContext } from "@/types/process-engine"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

export class ProcessEngine {

    /**
     * Start a new process for a lead
     */
    static async startProcess(leadId: string, type: string, initialContext: ProcessContext = {}): Promise<{ success: boolean, process?: ProcessInstance, error?: string }> {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) return { success: false, error: "No organization context" }

        // 1. Get Initial State for this Type
        const { data: initialState, error: stateError } = await supabaseAdmin
            .from('process_states')
            .select('*')
            .eq('organization_id', orgId)
            .eq('type', type)
            .eq('is_initial', true)
            .single()

        if (stateError || !initialState) {
            return { success: false, error: `No initial state defined for process type '${type}'` }
        }

        // 2. Check for existing active process of this type
        const { data: existing } = await supabaseAdmin
            .from('process_instances')
            .select('*')
            .eq('organization_id', orgId)
            .eq('lead_id', leadId)
            .eq('type', type)
            .eq('status', 'active')
            .single()

        if (existing) {
            return { success: false, error: `Lead already has an active '${type}' process` }
        }

        // 3. Create Instance
        try {
            const { data: newProcess, error: createError } = await supabaseAdmin
                .from('process_instances')
                .insert({
                    organization_id: orgId,
                    lead_id: leadId,
                    type: type,
                    current_state: initialState.key,
                    status: 'active',
                    context: initialContext,
                    history: [{
                        from: null,
                        to: initialState.key,
                        timestamp: new Date().toISOString(),
                        actor: 'system',
                        reason: 'Process Started'
                    }]
                })
                .select()
                .single()

            if (createError) throw createError

            return { success: true, process: newProcess as ProcessInstance }
        } catch (e: any) {
            console.error("Process Start Error:", e)
            return { success: false, error: e.message }
        }
    }

    /**
     * Get active process for a lead
     */
    static async getActiveProcess(leadId: string, type?: string): Promise<ProcessInstance | null> {
        const orgId = await getCurrentOrganizationId()
        if (!orgId) return null

        let query = supabaseAdmin
            .from('process_instances')
            .select('*')
            .eq('organization_id', orgId)
            .eq('lead_id', leadId)
            .eq('status', 'active')

        if (type) {
            query = query.eq('type', type)
        }

        // If multiple active processes (different types), this returns just one if type not specified.
        // Usually we want specific type or just "the active one" if we assume single-thread.
        // Let's assume for now a lead might have multiple (e.g. 'sale' and 'support').

        const { data, error } = await query.limit(1).single()

        if (error) return null
        return data as ProcessInstance
    }

    /**
     * Validate and Execute Transition
     */
    static async transition(instanceId: string, targetStateKey: string, actor: string = 'user', reason?: string): Promise<{ success: boolean, error?: string, process?: ProcessInstance }> {
        const supabase = await createClient() // Use user client for auth check? Or admin for rules?
        // Logic: Rules are absolute, but user must have permission to move.
        // We'll use Admin for the mechanics but rely on caller to verify user permission if needed (or RLS if direct update).
        // Since this is the Engine, checks rules first.

        const { data: instance, error: fetchError } = await supabaseAdmin
            .from('process_instances')
            .select('*')
            .eq('id', instanceId)
            .single()

        if (fetchError || !instance) return { success: false, error: "Process instance not found" }

        if (instance.status !== 'active') return { success: false, error: "Process is not active" }
        if (instance.locked) return { success: false, error: "Process is locked" }

        // 1. Get Current State Config
        const { data: currentState } = await supabaseAdmin
            .from('process_states')
            .select('*')
            .eq('organization_id', instance.organization_id)
            .eq('type', instance.type)
            .eq('key', instance.current_state)
            .single()

        if (!currentState) return { success: false, error: "Current state configuration missing" }

        // 2. Validate Transition
        const allowed = currentState.allowed_next_states || []
        if (!allowed.includes(targetStateKey)) {
            // Allow 'admin' override? For now, strict.
            return { success: false, error: `Transition from '${instance.current_state}' to '${targetStateKey}' is not allowed.` }
        }

        // 3. Get Target State (to check terminal/side-effects)
        const { data: targetState } = await supabaseAdmin
            .from('process_states')
            .select('*')
            .eq('organization_id', instance.organization_id)
            .eq('type', instance.type)
            .eq('key', targetStateKey)
            .single()

        if (!targetState) return { success: false, error: "Target state definition not found" }

        // 4. Update
        const newHistoryItem = {
            from: instance.current_state,
            to: targetStateKey,
            timestamp: new Date().toISOString(),
            actor,
            reason
        }

        const updates: any = {
            current_state: targetStateKey,
            history: [...(instance.history || []), newHistoryItem],
            updated_at: new Date().toISOString()
        }

        if (targetState.is_terminal) {
            updates.status = 'completed'
        }

        const { data: updated, error: updateError } = await supabaseAdmin
            .from('process_instances')
            .update(updates)
            .eq('id', instanceId)
            .select()
            .single()

        if (updateError) return { success: false, error: updateError.message }

        // 5. Apply Auto-Tags (if any)
        if (targetState.auto_tags && targetState.auto_tags.length > 0) {
            console.log(`[ProcessEngine] Applying auto-tags: ${targetState.auto_tags.join(', ')}`)

            // Fetch current tags
            const { data: lead } = await supabaseAdmin
                .from('leads') // Assuming 'leads' table (or clients/contacts?)
                .select('tags, id')
                .eq('id', instance.lead_id)
                .single()

            if (lead) {
                const currentTags = (lead.tags || []) as string[]
                const newTags = [...new Set([...currentTags, ...targetState.auto_tags])]

                await supabaseAdmin
                    .from('leads')
                    .update({ tags: newTags })
                    .eq('id', lead.id)
            }
        }

        return { success: true, process: updated as ProcessInstance }
    }

    /**
     * Get rich context for AI and UI: Active Instance + Current State Definition
     */
    static async getProcessContext(leadId: string): Promise<{ instance: ProcessInstance, state: ProcessState } | null> {
        const orgId = await getCurrentOrganizationId()
        if (!orgId) return null

        // 1. Get Instance
        const { data: instance } = await supabaseAdmin
            .from('process_instances')
            .select('*')
            .eq('organization_id', orgId)
            .eq('lead_id', leadId)
            .eq('status', 'active')
            .limit(1)
            .single()

        if (!instance) return null

        // 2. Get State
        const { data: state } = await supabaseAdmin
            .from('process_states')
            .select('*')
            .eq('organization_id', orgId)
            .eq('type', instance.type)
            .eq('key', instance.current_state)
            .single()

        if (!state) return null

        return { instance: instance as ProcessInstance, state: state as ProcessState }
    }
}
