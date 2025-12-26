"use server"

import { createClient } from "@/lib/supabase-server"

export async function getClientHistory(clientId: string) {
    const supabase = await createClient()

    try {
        // Fetch events where the entity is the client OR the payload references the client
        const { data, error } = await supabase
            .from('domain_events')
            .select('*')
            .or(`entity_id.eq.${clientId},payload->>clientId.eq.${clientId}`)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) throw error

        return { success: true, data }
    } catch (error) {
        console.error("Error fetching client history:", error)
        return { success: false, error }
    }
}
