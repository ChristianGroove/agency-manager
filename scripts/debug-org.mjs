
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
    const targetId = '4bdbdb3a-2b80-41de-af31-681fe1357cea'

    console.log(`Checking Org ID: ${targetId}`)

    // Get the target org
    const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('id, name, slug')
        .eq('id', targetId)
        .single()

    if (orgError) console.error('Error fetching org:', orgError.message)
    console.log('--- Organization Details ---')
    console.log(org || 'NOT FOUND')

    // Get credentials for target org
    const { data: creds, error: credError } = await supabaseAdmin
        .from('ai_credentials')
        .select('*')
        .eq('organization_id', targetId)

    if (credError) console.error('Error fetching creds:', credError.message)
    console.log('--- Credentials for this Org ---')
    console.log(creds || 'NONE')

    // Find pixy-agency to compare
    const { data: pixy } = await supabaseAdmin
        .from('organizations')
        .select('id, name')
        .ilike('name', '%pixy%')

    console.log('--- Pixy Organizations Search ---')
    console.log(pixy || 'NONE')

    if (pixy && pixy.length > 0) {
        for (const p of pixy) {
            const { data: pCreds } = await supabaseAdmin
                .from('ai_credentials')
                .select('id, provider_id, status')
                .eq('organization_id', p.id)
            console.log(`Credentials for ${p.name} (${p.id}):`)
            console.log(pCreds)
        }
    }
}

main()
