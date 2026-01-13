
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

async function debug() {
    console.log("Checking columns...")

    // Check 'status'
    const { data: d1, error: e1 } = await supabase.from('leads').select('status').limit(1)
    console.log("Column 'status':", e1 ? "MISSING" : "FOUND", d1?.[0])

    // Check 'pipeline_stage_id'
    const { data: d2, error: e2 } = await supabase.from('leads').select('pipeline_stage_id').limit(1)
    console.log("Column 'pipeline_stage_id':", e2 ? "MISSING" : "FOUND", d2?.[0])

    // Check 'stage_id' again (sanity)
    const { data: d3, error: e3 } = await supabase.from('leads').select('stage_id').limit(1)
    console.log("Column 'stage_id':", e3 ? "MISSING" : "FOUND", d3?.[0])
}

debug().catch(console.error)
