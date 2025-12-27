"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "./organizations"

export async function getSettings() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return null

    // Try to get the settings
    const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq('organization_id', orgId)
        .maybeSingle()

    if (error) {
        console.error("Error fetching settings:", error)
        return null
    }

    if (!data) {
        // No settings found, create default for this Org
        const { supabaseAdmin } = await import("@/lib/supabase-admin")

        // Provide defaults for potential NOT NULL columns
        const defaultSettings = {
            organization_id: orgId,
            agency_name: 'My Agency', // Fallback
            agency_email: 'contact@example.com',
            agency_currency: 'USD',
            default_language: 'en',
            portal_enabled: true
            // Add more if needed based on failures
        }

        const { data: newData, error: createError } = await supabaseAdmin
            .from("organization_settings")
            .insert(defaultSettings)
            .select()
            .single()

        if (createError) {
            console.error("Error creating default settings:", JSON.stringify(createError, null, 2))
            // If it fails, return null but log strictly
            return null
        }
        return newData
    }

    return data
}

export async function updateSettings(data: any) {
    const supabase = await createClient()

    // Remove id from data if it exists to avoid trying to update the primary key (though it shouldn't matter if it matches)
    // But we need the ID to identify the row.
    const { id, ...updateData } = data

    if (!id) {
        return { error: "Settings ID is required" }
    }

    const { error } = await supabase
        .from("organization_settings")
        .update({
            ...updateData,
            updated_at: new Date().toISOString()
        })
        .eq("id", id)

    if (error) {
        console.error("Error updating settings:", error)
        return { error: error.message }
    }

    revalidatePath("/settings")
    revalidatePath("/", "layout") // Revalidate global layout in case settings affect it (e.g. logo)

    return { success: true }
}
