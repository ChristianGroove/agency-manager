
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

const ORG_ID = process.argv[2]

if (!ORG_ID) {
    console.error("Usage: npx tsx src/scripts/backfill-process-instances.ts <ORG_ID>")
    process.exit(1)
}

async function backfill() {
    console.log(`Starting Backfill for Org: ${ORG_ID}`)

    // 1. Get Pipeline Stages (To map status string -> stage_id)
    const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('id, status_key')
        .eq('organization_id', ORG_ID)

    if (!stages) {
        console.error("No stages found.")
        return
    }

    const statusToStageId = new Map<string, string>()
    stages.forEach(s => statusToStageId.set(s.status_key, s.id))

    // 2. Get Pipeline-Process Mapping
    const { data: mappings } = await supabase
        .from('pipeline_process_map')
        .select('*')
        .eq('organization_id', ORG_ID)
        .eq('process_type', 'sale')

    if (!mappings || mappings.length === 0) {
        console.error("No mappings found. Run activate-process-mapping.ts first.")
        return
    }

    const stageToProcessKey = new Map<string, string>() // stage_id -> process_state_key
    mappings.forEach(m => stageToProcessKey.set(m.pipeline_stage_id, m.process_state_key))

    // 3. Get All Active Leads for this Org
    const { data: leads } = await supabase
        .from('leads')
        .select('id, name, status') // Correct column is 'status'
        .eq('organization_id', ORG_ID)

    if (!leads || leads.length === 0) {
        console.log("No leads found.")
        return
    }

    console.log(`Found ${leads.length} leads. Checking for missing process instances...`)

    let createdCount = 0

    for (const lead of leads) {
        // Check if instance exists
        const { data: existing } = await supabase
            .from('process_instances')
            .select('id')
            .eq('lead_id', lead.id)
            .eq('status', 'active')
            .single()

        if (existing) continue;

        // Resolve State
        const stageId = statusToStageId.get(lead.status)
        if (!stageId) {
            console.warn(`Lead ${lead.name} has unknown status: ${lead.status}`)
            continue
        }

        const stateKey = stageToProcessKey.get(stageId)

        if (stateKey) {
            // Create Instance
            const { error } = await supabase
                .from('process_instances')
                .insert({
                    organization_id: ORG_ID,
                    lead_id: lead.id,
                    type: 'sale',
                    current_state: stateKey,
                    status: 'active',
                    context: {},
                    history: [{
                        from: null,
                        to: stateKey,
                        timestamp: new Date().toISOString(),
                        actor: 'system',
                        reason: 'Backfill Migration'
                    }]
                })

            if (error) {
                console.error(`Failed to backfill lead ${lead.name} (${lead.id}):`, error.message)
            } else {
                createdCount++
                process.stdout.write('.')
            }
        } else {
            // Stage is unmapped (e.g. New might not be mapped if skipped?)
            // console.log(`Stage ${lead.status} is unmapped.`)
        }
    }

    console.log(`\nBackfill Complete. Created ${createdCount} process instances.`)
}

backfill()
