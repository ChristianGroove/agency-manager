
import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * Initialize Default CRM Settings for a new Organization.
 * 1. Creates default 'sale' Process States (Engine)
 * 2. Creates matching Pipeline Stages (UI)
 * 3. Maps them together (Bridge)
 */
export async function initializeOrganizationCRM(organizationId: string, templateId: string = 'agency') {
    console.log(`[CRM Init] Initializing for Org: ${organizationId}`)

    try {
        // 1. Determine Template
        const { CRMTemplates } = await import("../templates/registry")
        const template = CRMTemplates[templateId] || CRMTemplates['agency']

        console.log(`[CRM Init] Applying template: ${template.name}`)

        // --- CLEANUP PHASE (RESET) ---
        // Since we want a fresh start, we delete existing configurations.
        // NOTE: This assumes no critical data needs preservation, or that this is a desired hard-reset.

        // 2.1 Delete all Pipelines (Cascade should handle stages, but let's be safe)
        const { error: deletePipelineError } = await supabaseAdmin
            .from('pipelines')
            .delete()
            .eq('organization_id', organizationId)

        if (deletePipelineError) console.error("[CRM Init] Cleanup Pipelines Error:", deletePipelineError)

        // 2.2 Delete existing Process States (Engine) for 'sale' type
        const { error: deleteStateError } = await supabaseAdmin
            .from('process_states')
            .delete()
            .eq('organization_id', organizationId)
            .eq('type', 'sale')

        if (deleteStateError) console.error("[CRM Init] Cleanup States Error:", deleteStateError)

        console.log(`[CRM Init] Cleanup completed for ${organizationId}`)


        // --- CREATION PHASE ---

        // 3. Seed Process States (Engine)
        const stateMap = new Map<string, string>() // key -> id

        for (const s of template.processStates) {
            const { data: stateData, error: stateError } = await supabaseAdmin
                .from('process_states')
                .upsert({
                    organization_id: organizationId,
                    type: s.type,
                    key: s.key,
                    name: s.name,
                    is_initial: s.is_initial,
                    is_terminal: s.is_terminal,
                    allowed_next_states: s.allowed_next_states,
                    metadata: s.metadata,
                    suggested_actions: s.suggested_actions || [],
                    auto_tags: s.auto_tags || []
                }, { onConflict: 'organization_id,type,key' })
                .select('id')
                .single()

            if (stateData) stateMap.set(s.key, stateData.id)
            if (stateError) console.error(`[CRM Init] Error creating state ${s.key}:`, stateError.message)
        }

        console.log(`[CRM Init] Created ${stateMap.size} process states from template`)

        // 4. Create NEW Default Pipeline
        let pipelineId: string | null = null

        const { data: newPipeline, error: pipeError } = await supabaseAdmin
            .from('pipelines')
            .insert({
                organization_id: organizationId,
                name: `Ventas (${template.name})`,
                is_default: true,
                process_enabled: true // Default Strict Mode ON
            })
            .select('id')
            .single()

        if (newPipeline) {
            pipelineId = newPipeline.id
        } else {
            console.error("[CRM Init] Failed to create pipeline:", pipeError)
            return
        }

        // 5. Create Pipeline Stages (Visual) & Map them
        for (let i = 0; i < template.pipelineStages.length; i++) {
            const stage = template.pipelineStages[i]

            // Create Stage
            const { data: stageData, error: stageError } = await supabaseAdmin
                .from('pipeline_stages')
                .insert({
                    organization_id: organizationId,
                    pipeline_id: pipelineId,
                    name: stage.name,
                    status_key: stage.key,
                    display_order: i + 1,
                    color: stage.color,
                    icon: stage.icon,
                    is_active: true
                })
                .select('id')
                .single()

            if (stageData && stage.mapToProcessKey && stateMap.has(stage.mapToProcessKey)) {
                // Create Mapping
                await supabaseAdmin
                    .from('pipeline_process_map')
                    .insert({
                        organization_id: organizationId,
                        pipeline_stage_id: stageData.id,
                        process_type: 'sale',
                        process_state_key: stage.mapToProcessKey
                    })
            }
        }

        console.log(`[CRM Init] Completed CRM Initialization for ${organizationId}`)

    } catch (e: any) {
        console.error("[CRM Init] Fatal Error:", e)
    }
}
