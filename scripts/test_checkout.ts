import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function testCheckout() {
    const orgId = '9cce6d27-8616-40be-baf9-607de5e01ca1' // Test org ID

    const { data: newClient, error: clientError } = await supabaseAdmin
        .from('clients')
        .insert({
            organization_id: orgId,
            name: 'PWA Test ' + Date.now(),
            phone: '3009998877',
            type: 'lead'
        })
        .select()
        .single()

    fs.writeFileSync('error_log.json', JSON.stringify({ error: clientError, data: newClient }, null, 2))
    console.log("Done checking!")
}

testCheckout().catch(console.error)
