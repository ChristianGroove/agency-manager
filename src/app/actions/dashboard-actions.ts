'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/lib/actions/organizations"

export async function getDashboardData() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    // Define queries
    let clientsQuery = supabase.from('clients').select('*')
    let invoicesQuery = supabase.from('invoices').select('*')
    let servicesQuery = supabase.from('services').select('*')

    // For settings, we start with a builder, but we will execute it specifically
    let settingsQuery = supabase.from('organization_settings').select('*')

    // Apply base filters
    clientsQuery = clientsQuery.is('deleted_at', null)
    invoicesQuery = invoicesQuery.is('deleted_at', null)
    servicesQuery = servicesQuery.is('deleted_at', null)

    // Apply strict organization filter if orgId exists
    if (orgId) {
        clientsQuery = clientsQuery.eq('organization_id', orgId)
        invoicesQuery = invoicesQuery.eq('organization_id', orgId)
        servicesQuery = servicesQuery.eq('organization_id', orgId)
        settingsQuery = settingsQuery.eq('organization_id', orgId)
    }

    // Execute parallel
    // Note: settingsQuery is a builder, we need to call .maybeSingle() or .single() on it
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
