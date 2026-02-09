
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
    const roleId = '6b45e896-48a7-470c-a830-5392b4653a64'
    const orgId = 'd16ecfa7-6365-4f49-acf9-054314b88366'

    console.log(`\n🔍 CHECKING IDs:`)
    console.log(`Role ID: ${roleId}`)
    console.log(`Org ID: ${orgId}`)

    // 1. Check Role Definition
    const { data: role, error: roleError } = await supabase
        .from('organization_roles')
        .select('*')
        .eq('id', roleId)
        .single()

    console.log('\n--- Role Definition ---')
    if (roleError) console.error('Error:', roleError.message)
    console.log(role)

    // 2. Check Org Details
    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

    console.log('\n--- Org Definition ---')
    if (orgError) console.error('Error:', orgError.message)
    console.log(`Name: ${org?.name}`)
    console.log(`Type: '${org?.organization_type}'`) // Quote to see whitespace
}

main()
