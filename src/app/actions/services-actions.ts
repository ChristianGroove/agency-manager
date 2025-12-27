'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/lib/actions/organizations"

export async function getServices() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('services')
        .select(`
            *,
            client: clients(id, name, company_name)
        `)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching services:", error)
        return []
    }

    return data
}

export async function toggleServiceStatus(id: string, status: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('services')
        .update({ status })
        .eq('id', id)

    if (error) {
        console.error("Error updating service status:", error)
        return { success: false, error: error.message }
    }

    // Revalidate relevant paths
    // revalidatePath('/hosting') // Not needed if we return success and client refetches
    return { success: true }
}
