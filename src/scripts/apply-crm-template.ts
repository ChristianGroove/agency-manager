
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { initializeOrganizationCRM } from '../modules/core/crm/process-engine/init'

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
const TEMPLATE_ID = process.argv[3]

if (!ORG_ID || !TEMPLATE_ID) {
    console.error("Usage: npx tsx src/scripts/apply-crm-template.ts <ORG_ID> <TEMPLATE_ID>")
    console.log("Available Templates: agency, clinic, real_estate, legal, saas, consulting, construction, education, event_planning, ecommerce")
    process.exit(1)
}

async function applyTemplate() {
    console.log(`Applying template '${TEMPLATE_ID}' to Org '${ORG_ID}'...`)

    try {
        await initializeOrganizationCRM(ORG_ID, TEMPLATE_ID)
        console.log("Template applied successfully.")
    } catch (e: any) {
        console.error("Failed to apply template:", e)
    }
}

applyTemplate()
