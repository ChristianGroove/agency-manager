import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupSpam() {
    console.log('--- Cleaning Up Notification Spam ---')

    // 1. Fetch all 'payment_due' notifications
    // Note: In a huge DB this is bad, but for this specific user/context it's fine.
    // We can filter by 'Documento Vencido' title to be specific.
    const { data: notifications, error } = await supabase
        .from('notifications')
        .select('id, user_id, action_url, created_at')
        .eq('type', 'payment_due')
        .like('title', '%Vencido%')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching:', error)
        return
    }

    if (!notifications || notifications.length === 0) {
        console.log('No overdue notifications found.')
        return
    }

    console.log(`Found ${notifications.length} overdue notifications. Checking for duplicates...`)

    const seen = new Set<string>()
    const toDelete: string[] = []

    for (const note of notifications) {
        // Unique key: user + invoice url
        const key = `${note.user_id}-${note.action_url}`
        if (seen.has(key)) {
            // Already seen a newer one (since we ordered by desc), this is old/duplicate
            toDelete.push(note.id)
        } else {
            seen.add(key)
        }
    }

    console.log(`Found ${toDelete.length} duplicates to delete.`)

    if (toDelete.length > 0) {
        console.log(`Deleting ${toDelete.length} notifications in batches...`)
        const BATCH_SIZE = 50
        for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
            const batch = toDelete.slice(i, i + BATCH_SIZE)
            const { error: deleteError } = await supabase
                .from('notifications')
                .delete()
                .in('id', batch)

            if (deleteError) {
                console.error(`Error deleting batch ${i}:`, deleteError.message)
            } else {
                console.log(`✅ Deleted batch ${i}-${i + batch.length}`)
            }
        }
    }
}

cleanupSpam()
