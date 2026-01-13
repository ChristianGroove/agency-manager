
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
 * Seeds a default "Sale" process for a specific Organization
 */
async function seedProcessStates(organizationId: string) {
    console.log(`Seeding 'sale' process for Org: ${organizationId}`)

    const states = [
        {
            key: 'discovery',
            name: 'Discovery',
            type: 'sale',
            description: 'Initial contact and needs assessment',
            allowed_next_states: ['presentation', 'lost'],
            is_initial: true,
            is_terminal: false,
            metadata: { required_fields: ['email'] }
        },
        {
            key: 'presentation',
            name: 'Presentation',
            type: 'sale',
            description: 'Presenting the solution or proposal',
            allowed_next_states: ['negotiation', 'lost', 'discovery'], // Can go back to discovery
            is_initial: false,
            is_terminal: false,
            metadata: {}
        },
        {
            key: 'negotiation',
            name: 'Negotiation',
            type: 'sale',
            description: 'Discussing terms and price',
            allowed_next_states: ['checkout', 'lost', 'presentation'],
            is_initial: false,
            is_terminal: false,
            metadata: {}
        },
        {
            key: 'checkout',
            name: 'Waiting for Payment',
            type: 'sale',
            description: 'Invoice sent, waiting for transaction',
            allowed_next_states: ['won', 'lost', 'negotiation'],
            is_initial: false,
            is_terminal: false,
            metadata: { lock_pipeline: true }
        },
        {
            key: 'won',
            name: 'Closed Won',
            type: 'sale',
            description: 'Sale completed successfully',
            allowed_next_states: [],
            is_initial: false,
            is_terminal: true,
            metadata: {}
        },
        {
            key: 'lost',
            name: 'Closed Lost',
            type: 'sale',
            description: 'Sale lost',
            allowed_next_states: ['discovery'], // Can reactivate?
            is_initial: false,
            is_terminal: true,
            metadata: {}
        }
    ]

    for (const state of states) {
        const { error } = await supabase
            .from('process_states')
            .upsert({
                organization_id: organizationId,
                ...state
            }, { onConflict: 'organization_id,type,key' })

        if (error) console.error(`Failed to seed ${state.key}:`, error.message)
        else console.log(`Seeded state: ${state.key}`)
    }
}

// Allow running directly
// Usage: npx tsx src/scripts/seed-process-states.ts <org_id>
const orgIdArg = process.argv[2]
if (orgIdArg) {
    seedProcessStates(orgIdArg)
        .then(() => process.exit(0))
        .catch((e) => {
            console.error(e)
            process.exit(1)
        })
} else {
    console.log("Usage: npx tsx src/scripts/seed-process-states.ts <ORG_ID>")
    // If imported as module, do nothing
}
