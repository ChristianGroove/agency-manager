
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const META_VERSION = 'v24.0'
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
const ACCESS_TOKEN = process.env.META_PERMANENT_ACCESS_TOKEN

if (!WABA_ID || !ACCESS_TOKEN) {
    console.error('❌ Missing Credentials')
    process.exit(1)
}

async function debugWaba() {
    console.log(`🔍 Debugging WABA: ${WABA_ID}...`)

    const url = `https://graph.facebook.com/${META_VERSION}/${WABA_ID}/phone_numbers`

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`
            }
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('❌ Failed to fetch phone numbers:', JSON.stringify(data, null, 2))
            return
        }

        console.log(`✅ Found ${data.data?.length || 0} Phone Numbers:`)

        data.data?.forEach((p: any) => {
            console.log(`\n📱 Phone: ${p.display_phone_number} (ID: ${p.id})`)
            console.log(`   - Verified Name: ${p.verified_name}`)
            console.log(`   - Quality Rating: ${p.quality_rating}`)
            console.log(`   - Status: ${p.code_verification_status || 'Unknown'}`)
        })

    } catch (error) {
        console.error('❌ Script Error:', error)
    }
}

debugWaba()
