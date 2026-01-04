
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing env vars")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
    console.log("Inspecting organization_settings table...")

    // 1. Check if we can select all
    const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .limit(5)

    if (error) {
        console.error("Error selecting from organization_settings:", error)
    } else {
        console.log("Select successful. Rows found:", data?.length)
        if (data && data.length > 0) {
            console.log("Sample row:", data[0])
        }
    }

    // 2. Check table structure/columns via explicit check (mock)
    // We can't easily check schema via JS client without inspection views, but the select * gives us keys.

    // 3. Try to fetch specific row if we have an org
    const { data: orgs } = await supabase.from('organizations').select('id').limit(1)
    if (orgs && orgs.length > 0) {
        const orgId = orgs[0].id
        console.log(`Checking settings for Org ID: ${orgId}`)

        const { data: settings, error: settingsError } = await supabase
            .from('organization_settings')
            .select('*')
            .eq('organization_id', orgId)
            .maybeSingle()

        if (settingsError) {
            console.error("Error fetching specific settings:", settingsError)
        } else {
            console.log("Settings for org:", settings)
        }
    }
}

main()
