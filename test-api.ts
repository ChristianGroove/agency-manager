import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
    // 2. Login directly
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'mywebsandapps@gmail.com',
        password: 'Kendraankama2*'
    })
    
    if (authError) {
        console.error("Login failed:", authError.message)
        return
    }
    
    console.log("Logged in successfully. User ID:", authData.user.id)
    
    // 3. Try to get their organizations
    const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', authData.user.id)
        
    if (membersError) {
        console.error("Failed to get members:", membersError)
        return
    }
    
    console.log("User belongs to orgs:", members?.length)
    if (!members || members.length === 0) return;
    
    const orgId = members[0].organization_id;
    console.log("Trying to insert category for org:", orgId)
    
    // 4. Try to insert a category
    const { data: catData, error: catError } = await supabase
        .from('resto_menu_categories')
        .insert({
            organization_id: orgId,
            name: 'API Test Category',
            slug: 'api-test-category',
            order_index: 99
        })
        .select()
        
    if (catError) {
        console.error("INSERT FAILED:", catError)
    } else {
        console.log("INSERT SUCCEEDED:", catData)
    }
}
run()
