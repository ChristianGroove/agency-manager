
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

    // 1. Get latest user from auth.users (we can't query auth.users directly easily with js client acting as admin? 
    // actually service_role client usually has access to auth.admin.listUsers)

    // List users, sort by created_at DESC
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({
        perPage: 5,
        page: 1
    })

    if (usersError) {
        console.error('Error listing users:', usersError)
        return
    }

    // Sort manually if API doesn't support generic sort
    // listUsers usually returns by creation? Not guaranteed.
    // Let's assume the last ones are new.

    const sortedUsers = users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const latestUser = sortedUsers[0]

    if (!latestUser) {
        console.log('No users found')
        return
    }

    console.log('Latest User:', {
        id: latestUser.id,
        email: latestUser.email,
        role: latestUser.role,
        app_metadata: latestUser.app_metadata,
        user_metadata: latestUser.user_metadata,
        created_at: latestUser.created_at
    })

    // 2. Check Organization Members
    const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select(`
            *,
            organization_roles (id, name)
        `)
        .eq('user_id', latestUser.id)

    if (membersError) {
        console.error('Error fetching members:', membersError)
    } else {
        console.log('Organization Memberships:', JSON.stringify(members, null, 2))
    }
}

main()
