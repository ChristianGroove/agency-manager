'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { unstable_noStore as noStore } from "next/cache"

export async function getDashboardData() {
    noStore()
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    let clientsQuery = supabase.from('clients').select('*')
    let invoicesQuery = supabase.from('invoices').select('*')
    let servicesQuery = supabase.from('services').select('*')
    let settingsQuery = supabase.from('organization_settings').select('*')

    clientsQuery = clientsQuery.is('deleted_at', null)
    invoicesQuery = invoicesQuery.is('deleted_at', null)
    servicesQuery = servicesQuery.is('deleted_at', null)

    if (orgId) {
        clientsQuery = clientsQuery.eq('organization_id', orgId)
        invoicesQuery = invoicesQuery.eq('organization_id', orgId)
        servicesQuery = servicesQuery.eq('organization_id', orgId)
        settingsQuery = settingsQuery.eq('organization_id', orgId)
    }

    const [clientsRes, invoicesRes, servicesRes, settingsRes] = await Promise.all([
        clientsQuery,
        invoicesQuery,
        servicesQuery,
        settingsQuery.maybeSingle()
    ])

    return {
        clients: clientsRes.data || [],
        invoices: invoicesRes.data || [],
        services: servicesRes.data || [],
        settings: settingsRes.data || null
    }
}
