import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"

/**
 * Service Layer for Hosting Web Module
 * Pure business logic and database interactions for Hosting Accounts.
 */

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
            client:leads!client_id (
                id,
                name,
                company_name,
                logo_url
            )
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('[HostingService.getHostingAccounts] Error:', error)
        return []
    }

    return data
}

export async function getContactOptions() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('leads')
        .select('id, name, company_name')
        .eq('organization_id', orgId)
        .eq('contact_type', 'client')
        .is('deleted_at', null)
        .order('name')

    if (error) {
        console.error('[HostingService.getContactOptions] Error:', error)
        return []
    }

    return data
}

export async function getHostingAccountById(id: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return null

    const { data, error } = await supabase
        .from('hosting_accounts')
        .select(`
            *,
            client:leads!client_id (
                id,
                name,
                company_name
            )
        `)
        .eq('id', id)
        .eq('organization_id', orgId)
        .single()

    if (error) {
        console.error(`[HostingService.getHostingAccountById] Error for ID ${id}:`, error)
        return null
    }

    return data
}

export async function createHostingAccount(data: Partial<HostingAccount>) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error('No organization context')

    const { data: newAccount, error } = await supabase
        .from('hosting_accounts')
        .insert({
            ...data,
            organization_id: orgId
        })
        .select()
        .single()

    if (error) throw error

    return { success: true, data: newAccount }
}

export async function updateHostingAccount(id: string, data: Partial<HostingAccount>) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error('No organization context')

    const { data: updated, error } = await supabase
        .from('hosting_accounts')
        .update(data)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()

    if (error) throw error

    return { success: true, data: updated }
}

export async function deleteHostingAccount(id: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error('No organization context')

    const { error } = await supabase
        .from('hosting_accounts')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) throw error

    return { success: true }
}

