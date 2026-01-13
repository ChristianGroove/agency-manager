
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

async function dumpLeads() {
    console.log("Dumping Leads...")
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .limit(1)

    if (error) {
        console.error("Error Message:", error.message)
        console.error("Error Details:", error.details)
        console.error("Error Hint:", error.hint)
    } else {
        console.log("Leads Found:", data?.length)
        if (data && data.length > 0) {
            console.log("Columns:", Object.keys(data[0]))
            console.log("Sample ID:", data[0].id)
            console.log("Sample Stage/Status:", (data[0] as any).stage_id, (data[0] as any).status, (data[0] as any).pipeline_stage_id)
        } else {
            console.log("DATA IS EMPTY OR NULL")
            console.log("Error object if any:", error)
        }
    }
}

dumpLeads().catch(e => console.error("Top Level Error:", e))

dumpLeads()
