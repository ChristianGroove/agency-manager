'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"

/**
 * Toggle service status (active/inactive/paused)
 */
export async function toggleServiceStatus(serviceId: string, newStatus: 'active' | 'inactive' | 'paused') {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error('No organization context')

    const { error } = await supabase
        .from('services')
        .update({ status: newStatus })
        .eq('id', serviceId)
        .eq('organization_id', orgId)

    if (error) throw error

    revalidatePath('/services')
    revalidatePath('/hosting')
    revalidatePath('/clients')
    return { success: true }
}

export async function getServices() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('services')
        .select(`
            id,
            name,
            description,
            type,
            frequency,
            amount,
            status,
            created_at,
            client:clients (
                id,
                name,
                company_name
            )
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .is('deleted_at', null)

    if (error) {
        console.error('Error fetching services:', error)
        return []
    }

    return data
}

export async function deleteServices(ids: string[]) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error("Unauthorized")

    // Soft delete
    const { error } = await supabase
        .from('services')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids)
        .eq('organization_id', orgId)

    if (error) throw error

    // Cascade: Soft delete UNPAID invoices linked to these services
    const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ deleted_at: new Date().toISOString(), status: 'void' })
        .in('service_id', ids)
        .in('status', ['pending', 'overdue', 'draft'])
        .eq('organization_id', orgId)

    if (invoiceError) {
        console.error("Error cleaning up invoices for deleted services:", invoiceError)
    }

    revalidatePath('/hosting')
    return { success: true }
}
