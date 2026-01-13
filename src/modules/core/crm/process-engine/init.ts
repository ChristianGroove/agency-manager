
import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * Initialize Default CRM Settings for a new Organization.
 * 1. Creates default 'sale' Process States (Engine)
 * 2. Creates matching Pipeline Stages (UI)
 * 3. Maps them together (Bridge)
 */
export async function initializeOrganizationCRM(organizationId: string) {
    console.log(`[CRM Init] Initializing for Org: ${organizationId}`)

    try {
        // 1. Seed Process States (Engine)
        // Default strict process 'sale'
        const states = [
            {
                key: 'discovery',
                name: 'Descubrimiento',
                type: 'sale',
                is_initial: true,
                is_terminal: false,
                allowed_next_states: ['presentation', 'lost'],
                metadata: { goal: 'Calificar al cliente', required_fields: ['email'] },
                suggested_actions: [
                    { label: 'Agendar Demo', action: 'book_meeting', type: 'primary' },
                    { label: 'Descalificar', action: 'mark_lost', type: 'secondary' }
                ]
            },
            {
                key: 'presentation',
                name: 'Presentación',
                type: 'sale',
                is_initial: false,
                is_terminal: false,
                allowed_next_states: ['negotiation', 'lost', 'discovery'],
                metadata: { goal: 'Presentar propuesta de valor' },
                suggested_actions: [
                    { label: 'Enviar Propuesta', action: 'send_proposal', type: 'primary' }
                ]
            },
            {
                key: 'negotiation',
                name: 'Negociación',
                type: 'sale',
                is_initial: false,
                is_terminal: false,
                allowed_next_states: ['checkout', 'lost', 'presentation'],
                metadata: { goal: 'Cerrar términos económicos' },
                suggested_actions: [
                    { label: 'Ir al Cierre', action: 'move_to_checkout', type: 'primary' }
                ]
            },
            {
                key: 'checkout',
                name: 'Cierre / Pago',
                type: 'sale',
                is_initial: false,
                is_terminal: false, // Wait for payment
                allowed_next_states: ['won', 'lost', 'negotiation'],
                metadata: { goal: 'Recepcionar pago' },
                suggested_actions: [
                    { label: 'Registrar Pago', action: 'register_payment', type: 'primary' },
                    { label: 'Reenviar Link', action: 'resend_link', type: 'secondary' }
                ]
            },
            {
                key: 'won',
                name: 'Ganado',
                type: 'sale',
                is_initial: false,
                is_terminal: true,
                allowed_next_states: [],
                metadata: { goal: 'Onboarding' }
            },
            {
                key: 'lost',
                name: 'Perdido',
                type: 'sale',
                is_initial: false,
                is_terminal: true,
                allowed_next_states: ['discovery'], // Allow revival
                metadata: { goal: 'Nurture / Reactivación' }
            }
        ]

        const stateMap = new Map<string, string>() // key -> id

        for (const s of states) {
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
                    suggested_actions: s.suggested_actions || []
                }, { onConflict: 'organization_id,type,key' })
                .select('id')
                .single()

            if (stateData) stateMap.set(s.key, stateData.id)
            if (stateError) console.error(`[CRM Init] Error creating state ${s.key}:`, stateError.message)
        }

        console.log(`[CRM Init] Created ${stateMap.size} process states`)

        // 2. Create DEFAULT Pipeline (if not exists)
        let pipelineId: string | null = null
        const { data: existingPipeline } = await supabaseAdmin
            .from('pipelines')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('is_default', true)
            .maybeSingle()

        if (existingPipeline) {
            pipelineId = existingPipeline.id
        } else {
            const { data: newPipeline } = await supabaseAdmin
                .from('pipelines')
                .insert({
                    organization_id: organizationId,
                    name: 'Ventas (Estándar)',
                    is_default: true,
                    process_enabled: true // Default Strict Mode ON
                })
                .select('id')
                .single()
            if (newPipeline) pipelineId = newPipeline.id
        }

        if (!pipelineId) {
            console.error("[CRM Init] Failed to get/create pipeline")
            return
        }

        // 3. Create Default Pipeline Stages (Visual) & Map them
        const stages = [
            { name: 'Nuevos', key: 'new', mapTo: 'discovery', color: 'bg-blue-500', icon: 'circle' },
            { name: 'En Conversación', key: 'contacted', mapTo: 'presentation', color: 'bg-indigo-500', icon: 'message-circle' },
            { name: 'Propuesta', key: 'proposal', mapTo: 'negotiation', color: 'bg-purple-500', icon: 'file-text' },
            { name: 'Esperando Pago', key: 'closing', mapTo: 'checkout', color: 'bg-amber-500', icon: 'credit-card' },
            { name: 'Ganado', key: 'won', mapTo: 'won', color: 'bg-green-500', icon: 'check-circle' },
            { name: 'Perdido', key: 'lost', mapTo: 'lost', color: 'bg-red-500', icon: 'x-circle' }
        ]

        for (let i = 0; i < stages.length; i++) {
            const stage = stages[i]

            // Create Stage
            const { data: stageData, error: stageError } = await supabaseAdmin
                .from('pipeline_stages')
                .insert({
                    organization_id: organizationId,
                    pipeline_id: pipelineId,
                    name: stage.name,
                    status_key: stage.key, // Legacy key
                    display_order: i + 1,
                    color: stage.color,
                    icon: stage.icon,
                    is_active: true
                })
                .select('id')
                .single()

            if (stageData && stage.mapTo && stateMap.has(stage.mapTo)) {
                // Create Mapping
                await supabaseAdmin
                    .from('pipeline_process_map')
                    .insert({
                        organization_id: organizationId,
                        pipeline_stage_id: stageData.id,
                        process_type: 'sale',
                        process_state_key: stage.mapTo
                    })
            }
        }

        console.log(`[CRM Init] Completed CRM Initialization for ${organizationId}`)

    } catch (e: any) {
        console.error("[CRM Init] Fatal Error:", e)
    }
}
