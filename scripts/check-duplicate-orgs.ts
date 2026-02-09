
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
    const name = 'El Carnaval del Pollo Mirador'
    console.log(`\n🔍 SEARCHING FOR ORGS NAMED: "${name}"`)

    const { data: orgs, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('name', name)

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log(`Found ${orgs.length} organizations:`)
    orgs.forEach(org => {
        console.log(`- ID: ${org.id}`)
        console.log(`  Type: ${org.organization_type}`)
        console.log(`  Slug: ${org.slug}`)
        console.log(`  Vertical: ${org.vertical_key}`)
        console.log('---')
    })

    if (orgs.length > 1) {
        console.log('🚨 DUPLICATE DETECTED! Checking memberships for EACH...')
        const email = 'example@gmail.com'
        // Get User ID (Assume single user for now or fetch)
        const { data: { users } } = await supabase.auth.admin.listUsers()
        const user = users.find(u => u.email === email)

        if (user) {
            console.log(`Checking for user: ${user.id}`)
            for (const org of orgs) {
                const { data: member } = await supabase
                    .from('organization_members')
                    .select('*')
                    .eq('organization_id', org.id)
                    .eq('user_id', user.id)
                    .single()

                if (member) {
                    console.log(`✅ MEMBER of Org ${org.id}:`)
                    console.log(`   Role: ${member.role}`)
                    console.log(`   Role ID: ${member.role_id}`)
                } else {
                    console.log(`❌ NOT a member of Org ${org.id}`)
                }
            }
        }
    }
}

main()
