'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"

export interface HostingAccount {
    id: string
    organization_id: string
    client_id?: string
    domain_url: string
    provider_name?: string
    server_ip?: string
    plan_name?: string
    cpanel_url?: string
    status: 'active' | 'suspended' | 'cancelled'
    renewal_date?: string
    created_at: string
}

export async function getHostingAccounts() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('hosting_accounts')
        .select(`
            *,
            client:clients (
                id,
                name,
                company_name
            )
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching hosting accounts:', error)
        return []
    }

    return data
}

export async function createHostingAccount(data: any) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('hosting_accounts')
        .insert({
            ...data,
            organization_id: orgId
        })

    if (error) throw error

    revalidatePath('/platform/hosting-accounts')
    return { success: true }
}

export async function updateHostingAccount(id: string, data: any) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('hosting_accounts')
        .update(data)
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) throw error

    revalidatePath('/platform/hosting-accounts')
    return { success: true }
}

export async function deleteHostingAccount(id: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('hosting_accounts')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) throw error

    revalidatePath('/platform/hosting-accounts')
    return { success: true }
}
