import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing env vars')
        process.exit(1)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Find the user 'example@gmail.com'
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) {
        console.error('List Users Error', usersError)
        return
    }
    const targetUser = users.find(u => u.email === 'example@gmail.com')

    if (!targetUser) {
        console.error('User example@gmail.com not found')
        return
    }
    console.log('Found User:', targetUser.id, targetUser.email)
    console.log('App Metadata:', targetUser.app_metadata)

    // 2. Find the Org 'Carnaval del Pollo'
    const { data: orgs } = await supabase.from('organizations').select('id, name').ilike('name', '%carnaval%').limit(10)

    console.log('Found Orgs:', orgs)

    if (!orgs || orgs.length === 0) {
        console.error('Org not found')
        return
    }
    const targetOrg = orgs[0]
    console.log('Found Org:', targetOrg.id, targetOrg.name)

    // 3. Replicate getCachedUserPermissions logic directly

    const { data, error } = await supabase
        .from('organization_members')
        .select(`
            role,
            role_id,
            role_details:organization_roles (
                name,
                permissions,
                is_system_role
            )
        `)
        .eq('user_id', targetUser.id)
        .eq('organization_id', targetOrg.id)
        .single()

    if (error) {
        console.error('DB Error fetching member:', error)
    } else {
        console.log('Member Record:', JSON.stringify(data, null, 2))

        let role = data.role
        let roleDetails = data.role_details

        if (roleDetails) {
            // If role_id is present, use that
            // role_details might be array or object depending on relationship?
            const detail = Array.isArray(roleDetails) ? roleDetails[0] : roleDetails
            console.log('Role Detail Object:', detail)
            role = detail.name
        }

        console.log('Calculated Role Name:', role)

        // Check Profile for Super Admin
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', targetUser.id).single()
        console.log('Profile Data:', profile)
    }
}

main()
