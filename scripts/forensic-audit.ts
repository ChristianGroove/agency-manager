
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
    const email = 'example@gmail.com'
    console.log(`\n🔍 AUDIT START: ${email}`)

    // 1. Find ALL Users with this email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
    const targetUsers = users.filter(u => u.email === email)

    console.log(`\n👤 Users Found: ${targetUsers.length}`)
    targetUsers.forEach(u => console.log(`   - ID: ${u.id} | Metadata:`, u.user_metadata))

    if (targetUsers.length === 0) return

    for (const user of targetUsers) {
        console.log(`\n--- Analyzing User: ${user.id} ---`)

        // 2. Check Profile
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        console.log(`   📄 Profile Role: ${profile?.platform_role}`)

        // 3. List ALL Memberships
        const { data: memberships } = await supabase
            .from('organization_members')
            .select(`
                role,
                role_id,
                organization_id,
                org:organizations (
                    id,
                    name,
                    slug,
                    organization_type,
                    parent_organization_id
                )
            `)
            .eq('user_id', user.id)

        console.log(`   🏢 Memberships (${memberships?.length || 0}):`)
        memberships?.forEach(m => {
            console.log(`      [${m.org?.name}] (${m.org?.organization_type})`)
            console.log(`          ID: ${m.organization_id}`)
            console.log(`          Role: ${m.role}`)
            console.log(`          RoleID: ${m.role_id}`)
        })
    }
}

main()
