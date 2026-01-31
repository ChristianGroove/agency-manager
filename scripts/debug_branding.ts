
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugBranding() {
    console.log('--- DEBUG BRANDING EXTENDED ---')

    // 1. Search for Dannicel
    const { data: orgs, error: searchError } = await supabaseAdmin
        .from('organizations')
        .select('id, name, slug, branding_tier_id')
        .ilike('name', '%Dannicel%')

    if (searchError || !orgs || orgs.length === 0) {
        console.log('Dannicel not found')
        return
    }

    const org = orgs[0]
    console.log(`Found Org: ${org.name} (${org.id})`)
    console.log(`Tier ID: ${org.branding_tier_id}`)

    // 2. Query Organization Settings
    const { data: settings, error: settingsError } = await supabaseAdmin
        .from('organization_settings')
        .select('main_logo_url, portal_logo_url, updated_at')
        .eq('organization_id', org.id)
        .single()

    console.log('Organization Settings:', settingsError ? settingsError : settings)
}

debugBranding()
