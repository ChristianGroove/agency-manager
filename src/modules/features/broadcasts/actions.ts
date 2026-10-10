'use server'

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { requireMarketingAccess } from './marketing-access'
import { getRecipientCount as countMarketingRecipients } from './marketing-actions'
import { revalidatePath } from "next/cache"

export type Broadcast = {
    id: string
    name: string
    message: string
    status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed'
    channel: 'whatsapp' | 'sms' | 'email'
    total_recipients: number
    sent_count: number
    delivered_count: number
    read_count: number
    failed_count: number
    scheduled_at: string | null
    sent_at: string | null
    completed_at: string | null
    created_at: string
    updated_at: string
    filters: Record<string, unknown>
}

// Get all broadcasts for the organization
export async function getBroadcasts() {
    await requireMarketingAccess('view')

    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) throw new Error("Unauthorized")

        const { data, error } = await supabase
            .from('broadcasts')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, broadcasts: (data || []) as Broadcast[] }
    } catch (error) {
        console.error("Error fetching broadcasts:", error)
        return { success: false, error: String(error), broadcasts: [] }
    }
}

// Get a single broadcast by ID
export async function getBroadcast(id: string) {
    await requireMarketingAccess('view')

    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) throw new Error("Unauthorized")

        const { data, error } = await supabase
            .from('broadcasts')
            .select('*')
            .eq('id', id)
            .eq('organization_id', orgId)
            .single()

        if (error) throw error

        return { success: true, broadcast: data as Broadcast }
    } catch (error) {
        console.error("Error fetching broadcast:", error)
        return { success: false, error: String(error) }
    }
}

// Create a new broadcast
export async function createBroadcast(data: {
    name: string
    message: string
    channel: 'whatsapp' | 'sms' | 'email'
    filters: Record<string, unknown>
    scheduled_at?: string
}) {
    await requireMarketingAccess('manage')

    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) throw new Error("Unauthorized")

        // Count recipients based on filters
        let recipientCount = 0
        let query = supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)

        // Apply filters
        if (data.filters.status) {
            query = query.eq('status', data.filters.status)
        }
        if (data.filters.has_phone) {
            query = query.not('phone', 'is', null)
        }
        if (data.filters.has_email) {
            query = query.not('email', 'is', null)
        }

        const { count } = await query
        recipientCount = count || 0

        const { data: broadcast, error } = await supabase
            .from('broadcasts')
            .insert({
                organization_id: orgId,
                name: data.name,
                message: data.message,
                channel: data.channel,
                filters: data.filters,
                status: data.scheduled_at ? 'scheduled' : 'draft',
                scheduled_at: data.scheduled_at || null,
                total_recipients: recipientCount,
                sent_count: 0,
                delivered_count: 0,
                read_count: 0,
                failed_count: 0
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/crm/broadcasts')
        return { success: true, broadcast }
    } catch (error) {
        console.error("Error creating broadcast:", error)
        return { success: false, error: String(error) }
    }
}

// Send a broadcast (start sending)
export async function sendBroadcast(id: string) {
    await requireMarketingAccess('execute')
    return { success: false, error: 'Este emisor simulado fue retirado. Usa una campaña validada de Marketing.' }
}

// Delete a broadcast
export async function deleteBroadcast(id: string) {
    await requireMarketingAccess('manage')

    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) throw new Error("Unauthorized")

        const { error } = await supabase
            .from('broadcasts')
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId)

        if (error) throw error

        revalidatePath('/crm/broadcasts')
        return { success: true }
    } catch (error) {
        console.error("Error deleting broadcast:", error)
        return { success: false, error: String(error) }
    }
}

// Get recipient count for given filters
export async function getRecipientCount(filters: Record<string, unknown>) {
    return countMarketingRecipients(filters)
}

