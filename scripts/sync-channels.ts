
import dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const META_VERSION = 'v24.0'
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
const ACCESS_TOKEN = process.env.META_PERMANENT_ACCESS_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ORG_ID = '334ab512-a72a-430b-bda8-b0e77d40dd58' // Production Org ID for Pixy

if (!WABA_ID || !ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Env Vars')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function syncChannels() {
    console.log(`🔄 Starting Channel Sync for WABA: ${WABA_ID}`)

    const url = `https://graph.facebook.com/${META_VERSION}/${WABA_ID}/phone_numbers`

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`
            }
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('❌ Failed to list phone numbers:', JSON.stringify(data, null, 2))
            process.exit(1)
        }

        const numbers = data.data || []
        console.log(`📱 Found ${numbers.length} phone numbers in WABA.`)

        for (const phone of numbers) {
            console.log(`   - Processing: ${phone.display_phone_number} (ID: ${phone.id})`)

            // Upsert into channels table
            const { error } = await supabase
                .from('channels')
                .upsert({
                    organization_id: ORG_ID,
                    provider: 'meta_cloud',
                    provider_channel_id: phone.id,
                    name: phone.verified_name,
                    identifier: phone.display_phone_number, // Or clean normalized number
                    status: 'CONNECTED', // We assume connected in Coexistence
                    config: {
                        waba_id: WABA_ID,
                        quality_rating: phone.quality_rating,
                        code_verification_status: phone.code_verification_status
                    },
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'provider_channel_id'
                })

            if (error) {
                console.error(`     ❌ Error syncing channel:`, error.message)
            } else {
                console.log(`     ✅ Synced successfully.`)
            }
        }

    } catch (error) {
        console.error('❌ Network/Script Error:', error)
    }
}

syncChannels()
