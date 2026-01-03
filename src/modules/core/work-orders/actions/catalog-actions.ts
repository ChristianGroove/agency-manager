'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { ServiceCatalogItem } from "@/types"

export async function getActiveServices() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    // Fetch from service_catalog
    const { data, error } = await supabase
        .from('service_catalog')
        .select('*')
        .eq('organization_id', orgId)
        .order('name', { ascending: true })

    if (error) {
        console.error("Error fetching services:", error)
        return []
    }

    return data as ServiceCatalogItem[]
}

export async function getStaffMembers() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    // Fetch from organization_members
    const { data, error } = await supabase
        .from('organization_members')
        .select('user_id, first_name, last_name, email, role')
        .eq('organization_id', orgId)

    if (error) {
        console.error("Error fetching staff:", error)
        return []
    }

    // Transform to simple list
    return data.map(m => ({
        id: m.user_id,
        name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email,
        email: m.email,
        role: m.role
    }))
}

export async function getClients() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('organization_id', orgId)
        .order('name', { ascending: true })

    if (error) return []
    return data
}
