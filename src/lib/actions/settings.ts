"use server"

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

export async function getSettings() {
    const supabase = await createClient()

    // Try to get the settings
    const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .single()

    if (error) {
        if (error.code === 'PGRST116') {
            // No settings found, create default
            const { data: newData, error: createError } = await supabase
                .from("organization_settings")
                .insert({})
                .select()
                .single()

            if (createError) {
                console.error("Error creating default settings:", createError)
                return null
            }
            return newData
        }

        console.error("Error fetching settings:", error)
        return null
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
