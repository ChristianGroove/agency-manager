const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function check() {
    console.log("Checking client_events...")
    const { error: eventsError } = await supabase.from('client_events').select('id').limit(1)
    if (eventsError) {
        console.log("client_events error:", eventsError.message)
        console.log("Code:", eventsError.code)
    } else {
        console.log("client_events exists")
    }

    console.log("Checking organization_settings columns...")
    const { error: settingsError } = await supabase.from('organization_settings').select('portal_enabled').limit(1)
    if (settingsError) {
        console.log("organization_settings error:", settingsError.message)
        console.log("Code:", settingsError.code)
    } else {
        console.log("organization_settings has portal_enabled")
    }
}

check()
