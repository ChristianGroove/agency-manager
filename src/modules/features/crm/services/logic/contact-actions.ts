"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"

export type SidebarContact = {
    id: string
    name: string
    phone: string | null
    email: string | null
    avatar_url: string | null
    last_contacted_at: string | null
    company_name: string | null
    status?: string
}

export async function getSidebarContacts(query: string = ""): Promise<SidebarContact[]> {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        console.log('[getSidebarContacts] Fetching for Org:', orgId)

        const { data: { user } } = await supabase.auth.getUser()
        console.log('[getSidebarContacts] Current User ID:', user?.id)

        if (!orgId) {
            console.error('[getSidebarContacts] No organization ID found in session')
            return [{
                id: 'debug-error-org',
                name: 'DEBUG ERROR: No Org ID',
                phone: null,
                email: null,
                avatar_url: null,
                last_contacted_at: new Date().toISOString(),
                company_name: 'System',
                status: 'error'
            }]
        }

        let dbQuery = supabase
            .from('leads')
            .select('id, name, phone, email, created_at, company_name, contact_type')
            .eq('organization_id', orgId)
            .eq('contact_type', 'client') // FIltrar quirúrgicamente para mostrar solo clientes en este tab
            .is('deleted_at', null)
            .not('phone', 'is', null) // Only contacts with phone
            .neq('phone', '')         // Only contacts with non-empty phone
            .order('created_at', { ascending: false })
            .limit(50)

        if (query.trim()) {
            const searchTerm = `%${query.trim()}%`
            dbQuery = dbQuery.or(`name.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm},company_name.ilike.${searchTerm}`)
        }

        const { data, error } = await dbQuery

        if (error) {
            console.error('Error fetching sidebar contacts:', error)
            return []
        }

        // Map lead data to SidebarContact format
        return (data || []).map((contact: any) => ({
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            avatar_url: null,
            last_contacted_at: contact.created_at,
            company_name: contact.company_name,
            status: contact.contact_type
        }))

    } catch (error) {
        console.error('Server Action Error:', error)
        return []
    }
}

