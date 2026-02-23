/**
 * Debug script: Check what templates exist in Meta for the org's WABA
 * Run: npx tsx scripts/debug-templates.ts
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function main() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    console.log('=== 1. Checking integration_connections ===')
    const { data: connections, error: connError } = await supabase
        .from('integration_connections')
        .select('id, provider_key, status, connection_name, metadata, credentials')
        .in('provider_key', ['meta_whatsapp', 'whatsapp_cloud'])

    if (connError) {
        console.error('Error fetching connections:', connError.message)
        return
    }

    console.log(`Found ${connections?.length || 0} Meta/WhatsApp connections:`)
    for (const conn of connections || []) {
        const meta = conn.metadata as any || {}
        const creds = conn.credentials as any || {}
        console.log(`  - ${conn.connection_name} [${conn.provider_key}] status=${conn.status}`)
        console.log(`    metadata keys:`, Object.keys(meta))
        console.log(`    metadata.waba_id:`, meta.waba_id || 'MISSING')
        console.log(`    metadata.asset_id:`, meta.asset_id || 'MISSING')
        console.log(`    credentials keys:`, typeof creds === 'string' ? 'ENCRYPTED_STRING' : Object.keys(creds))

        // Try to resolve access token
        const accessToken = creds?.access_token || creds?.accessToken
        const wabaId = meta?.waba_id || creds?.waba_id

        if (!wabaId) {
            console.log(`    ⚠️  No WABA ID found for this connection`)
            continue
        }
        if (!accessToken) {
            console.log(`    ⚠️  No access token found (might be encrypted)`)
            // Try to use it as-is if it's a string (might be the encrypted value)
            continue
        }

        console.log(`\n=== 2. Fetching templates from Meta for WABA: ${wabaId} ===`)
        const url = `https://graph.facebook.com/v24.0/${wabaId}/message_templates?fields=name,status,category,language,components&limit=100`
        console.log('URL:', url)

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })

            const result = await response.json()

            if (!response.ok) {
                console.error('Meta API Error:', JSON.stringify(result, null, 2))
                continue
            }

            const templates = result.data || []
            console.log(`\nGot ${templates.length} templates from Meta:`)
            for (const t of templates) {
                console.log(`  - ${t.name} (${t.language}) [${t.status}] id=${t.id}`)
            }

            if (templates.length === 0) {
                console.log('\n⚠️  Meta returned 0 templates. This WABA has no templates registered.')
                console.log('   You need to create templates in Meta Business Manager first.')
            }
        } catch (e: any) {
            console.error('Fetch error:', e.message)
        }
    }

    console.log('\n=== 3. Checking local messaging_templates table ===')
    const { data: localTemplates } = await supabase
        .from('messaging_templates')
        .select('id, name, language, status, meta_id, category')

    console.log(`Found ${localTemplates?.length || 0} local templates:`)
    for (const t of localTemplates || []) {
        console.log(`  - ${t.name} (${t.language}) [${t.status}] meta_id=${t.meta_id || 'NONE'}`)
    }
}

main().catch(console.error)
