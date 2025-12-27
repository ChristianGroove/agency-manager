'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/lib/actions/organizations"
import { Invoice } from "@/types"

export async function getInvoices() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('invoices')
        .select(`
            *,
            client:clients(name)
        `)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('date', { ascending: false })

    if (error) {
        console.error("Error fetching invoices:", error)
        return []
    }

    return data as unknown as Invoice[]
}
