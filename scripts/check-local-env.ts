
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load .env.local manually to simulate Next.js behavior
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    console.log(`Loading env from ${envPath}`)
    const envConfig = dotenv.parse(fs.readFileSync(envPath))
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
} else {
    console.error("❌ .env.local NOT FOUND at " + envPath)
    process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log("--- DEBUGGING ENVIRONMENT ---")
console.log(`URL: ${url}`)
console.log(`ANON KEY: ${key ? key.substring(0, 10) + '...' : 'MISSING'}`)
console.log(`SERVICE KEY: ${serviceKey ? serviceKey.substring(0, 10) + '...' : 'MISSING'}`)

if (!url || !key) {
    console.error("❌ MISSING CRITICAL VARIABLES")
    process.exit(1)
}

async function testConnection() {
    console.log("\n--- TESTING CONNECTION ---")

    try {
        const supabase = createClient(url!, key!)
        const { data, error } = await supabase.from('email_templates').select('count').limit(1).maybeSingle()

        if (error) {
            console.error("❌ CLIENT CONNECTION FAILED:", error.message)
            if (error.message.includes("Invalid API Key")) {
                console.error("👉 The ANON KEY is invalid or expired.")
            }
        } else {
            console.log("✅ CLIENT CONNECTION SUCCESSFUL")
        }

    } catch (e: any) {
        console.error("❌ UNEXPECTED ERROR:", e.message)
    }
}

testConnection()
