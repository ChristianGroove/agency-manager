const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = "https://amwlwmkejdjskukdfwut.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd2x3bWtlamRqc2t1a2Rmd3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDg2OTUsImV4cCI6MjA4MTQyNDY5NX0.X7zYfWR9J83sXnYCEfvB7u_tNTupHqd5GQC82gOO__E"

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
