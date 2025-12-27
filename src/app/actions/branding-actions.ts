"use server"

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/lib/actions/organizations"
import { revalidatePath } from "next/cache"

export async function updateOrganizationBranding(data: {
    portal_primary_color?: string
    portal_secondary_color?: string
    portal_title?: string
    portal_logo_url?: string
}) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error("No organization context")

    // Upsert organization_settings
    const { error } = await supabase
        .from('organization_settings')
        .upsert({
            organization_id: orgId,
            ...data,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'organization_id'
        })

    if (error) throw error

    revalidatePath('/platform/settings/branding')
    return { success: true }
}

export async function getOrganizationBranding() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return null

    const { data, error } = await supabase
        .from('organization_settings')
        .select('portal_primary_color, portal_secondary_color, portal_title, portal_logo_url')
        .eq('organization_id', orgId)
        .single()

    if (error) return null
    return data
}
