import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function test() {
    // get the user
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users.users.find(u => u.email === 'mywebsandapps@gmail.com')
    
    // get user's orgs
    const { data: orgs } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', user!.id)
        
    console.log("User orgs:", orgs)
    
    // create a client impersonating the user
    const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: {
            headers: {
                Authorization: `Bearer ${user!.id}` // Wait, impersonation requires JWT, not just user id.
            }
        }
    })
    
    // Let's use RPC or generate JWT? Too hard. Let's just create an SQL test.
}
test()
