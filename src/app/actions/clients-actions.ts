"use server"

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { logDomainEvent } from "@/lib/event-logger"

interface QuickProspectData {
    name: string
    email?: string
    phone?: string
    userId: string
}

export async function quickCreateProspect(data: QuickProspectData) {
    const supabase = await createClient()
    try {
        console.log("Attempting to create prospect:", data)

        // Validate data
        if (!data.name) return { success: false, error: "Missing name" }
        if (!data.userId) return { success: false, error: "Forbiden: Missing User ID" }

        const { data: newClient, error } = await supabase
            .from('clients')
            .insert({
                user_id: data.userId,
                name: data.name,
                email: data.email,
                phone: data.phone,
                // status: 'prospect', // Uncomment if status column exists in DB
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) {
            console.error("Supabase insert error:", error)
            return { success: false, error: error.message }
        }

        await logDomainEvent(
            'client',
            newClient.id,
            'client.created_prospect',
            {
                name: newClient.name,
                origin: 'quote_builder_quick_action'
            },
            'user',
            data.userId
        )

        revalidatePath('/quotes')
        return { success: true, client: newClient }
    } catch (error: any) {
        console.error("Error creating prospect:", error)
        return { success: false, error: error.message || 'Failed to create prospect' }
    }
}
