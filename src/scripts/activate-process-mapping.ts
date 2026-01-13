
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Maps standard Pipeline Stages to Process States for an Organization
 * This "Activates" the strict Process Engine for these stages.
 */
async function activateProcessMapping(organizationId: string) {
    console.log(`Activating Process Engine (Mapping) for Org: ${organizationId}`)

    // 1. Fetch Pipeline Stages (UI)
    const { data: stages, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('organization_id', organizationId)

    if (stagesError || !stages) {
        console.error("Failed to fetch pipeline stages:", stagesError?.message)
        return
    }
    console.log(`Found ${stages.length} pipeline stages.`)

    // 2. Fetch Process States (Engine) - Type 'sale'
    const { data: processStates, error: stateError } = await supabase
        .from('process_states')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('type', 'sale')

    if (stateError || !processStates) {
        console.error("Failed to fetch process states (did you run seed-process-states?):", stateError?.message)
        return
    }
    console.log(`Found ${processStates.length} process states (type: sale).`)

    // 3. Define Standard Map (Status Key -> Process Key)
    // Adjust this map based on your specific seeds
    const mapDef: Record<string, string> = {
        'new': 'discovery',        // "Nuevo" -> Discovery
        'contacted': 'presentation', // "Contactado" -> Presentation (Example)
        'qualified': 'presentation', // "Calificado" -> Presentation
        'negotiation': 'negotiation',// "Negociación" -> Negotiation
        'waiting_payment': 'checkout', // "Esperando Pago" -> Checkout
        'won': 'won',               // "Ganado" -> Closed Won
        'lost': 'lost'              // "Perdido" -> Closed Lost
    }

    // 4. Execute Mapping
    for (const stage of stages) {
        const targetProcessKey = mapDef[stage.status_key]

        if (targetProcessKey) {
            // Find the state UUID
            const pState = processStates.find(ps => ps.key === targetProcessKey)

            if (pState) {
                // Upsert Mapping
                const { error: mapError } = await supabase
                    .from('pipeline_process_map')
                    .upsert({
                        organization_id: organizationId,
                        pipeline_stage_id: stage.id,
                        process_type: 'sale',
                        process_state_key: targetProcessKey
                    }, { onConflict: 'pipeline_stage_id,process_type' })

                if (mapError) {
                    console.error(`Failed to map stage '${stage.name}' (${stage.status_key}) error:`, mapError.message)
                } else {
                    console.log(`✅ Mapped: UI [${stage.name}] <==> Engine [${targetProcessKey}]`)
                }
            } else {
                console.warn(`⚠️ Skipped: No process state found for key '${targetProcessKey}'`)
            }
        } else {
            console.log(`ℹ️ Unmapped: Stage '${stage.name}' (${stage.status_key}) remains permissive (Standard CRM mode)`)
        }
    }
}

// Allow running directly
// Usage: npx tsx src/scripts/activate-process-mapping.ts <org_id>
const orgIdArg = process.argv[2]
if (orgIdArg) {
    activateProcessMapping(orgIdArg)
        .then(() => process.exit(0))
        .catch((e) => {
            console.error(e)
            process.exit(1)
        })
} else {
    console.log("Usage: npx tsx src/scripts/activate-process-mapping.ts <ORG_ID>")
}
