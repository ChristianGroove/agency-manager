
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function inspect() {
    console.log("Inspecting messaging_templates...")

    // Check columns by selecting one row
    const { data, error } = await supabase
        .from('messaging_templates')
        .select('*')
        .limit(1)

    if (error) {
        console.error("Error selecting:", error)
        return
    }

    if (data && data.length > 0) {
        console.log("Row keys:", Object.keys(data[0]))
        console.log("Sample Data:", data[0])
    } else {
        console.log("Table is empty, cannot infer columns easily from data.")
    }
}

inspect()
