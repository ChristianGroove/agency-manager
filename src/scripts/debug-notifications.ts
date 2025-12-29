import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugNotifications() {
    console.log('--- Debugging Notifications ---')

    // 1. Check Organization Members Schema
    console.log('\n1. Checking organization_members...')
    const { data: members, error: memberError } = await supabase
        .from('organization_members')
        .select('*')
        .limit(5)

    if (memberError) {
        console.error('Error fetching members:', memberError.message)
    } else {
        console.log('Members sample:', JSON.stringify(members, null, 2))
    }

    // 2. Check Notifications
    console.log('\n2. Checking recent notifications...')
    const { data: notes, error: noteError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

    if (noteError) {
        console.error('Error fetching notifications:', noteError.message)
    } else {
        console.log('Recent Notifications:', notes?.length)
        if (notes && notes.length > 0) {
            console.log('Sample Notification:', JSON.stringify(notes[0], null, 2))

            // Analyze for duplicates (Lazaro)
            const titles = notes.map(n => n.title)
            console.log('Titles:', titles)
        }
    }
}

debugNotifications()
