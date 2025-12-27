'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/lib/actions/organizations"
import { Quote } from "@/types"

export async function getQuotes() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('quotes')
        .select(`
            *,
            client:clients (name, company_name),
            lead:leads (name, company_name)
        `)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching quotes:", error)
        return []
    }

    return data as Quote[]
}
