"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { getActiveModules } from "@/modules/core/saas/saas-actions"
import { requireOrgRole } from "@/lib/auth/org-roles"
import { cache } from "react"

export const getSettings = cache(async () => {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return null

    const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq('organization_id', orgId)
        .maybeSingle()

    if (error) {
        console.error("[getSettings] Error:", error.message)
        return null
    }

    if (!data) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null

        const { data: member } = await supabase
            .from('organization_members')
            .select('id')
            .eq('organization_id', orgId)
            .eq('user_id', user.id)
            .maybeSingle()

        if (!member) return null

        const defaultSettings = {
            organization_id: orgId,
            agency_name: 'My Agency',
            agency_currency: 'USD',
            default_language: 'es',
            portal_enabled: true
        }

        const { data: newData, error: createError } = await supabaseAdmin
            .from("organization_settings")
            .insert(defaultSettings)
            .select()
            .single()

        if (createError) {
            if (createError.code === '23505') {
                const { data: existingData } = await supabaseAdmin
                    .from("organization_settings")
                    .select("*")
                    .eq('organization_id', orgId)
                    .single()
                return existingData
            }
            return null
        }
        return newData
    }

    return data
})

export async function updateSettings(data: any) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { error: "No organization selected" }

    const { id, ...updateData } = data
    if (!id) return { error: "Settings ID is required" }

    await requireOrgRole('admin')

    const activeModules = await getActiveModules(orgId)
    const validatedData = await validateSettingsData(updateData, activeModules || [])

    const { error } = await supabase
        .from("organization_settings")
        .update({
            ...validatedData.data,
            updated_at: new Date().toISOString()
        })
        .eq("id", id)

    if (error) return { error: error.message }

    revalidatePath("/settings")
    revalidatePath("/", "layout")

    return { success: true }
}

async function validateSettingsData(data: any, activeModules: string[]) {
    const validatedData: any = {}
    const fieldModuleMap: Record<string, string> = {
        'invoice_prefix': 'module_invoicing',
        'invoice_next_number': 'module_invoicing',
        'quote_prefix': 'module_invoicing',
        'stripe_public_key': 'module_payments',
        'stripe_private_key': 'module_payments',
        'email_sender_name': 'module_communications'
    }

    for (const [key, value] of Object.entries(data)) {
        const requiredModule = fieldModuleMap[key]
        if (!requiredModule || activeModules.includes(requiredModule)) {
            validatedData[key] = value
        }
    }
    return { data: validatedData }
}
