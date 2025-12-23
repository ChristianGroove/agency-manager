"use server"


import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin" // Import Admin Client
import { revalidatePath } from "next/cache"

export async function getMetaConfig(clientId: string) {
    const supabase = await createClient() // Read can stay with user if policy allows, but policy is strict (false). 
    // Actually, policy is false for everyone, so even read needs admin if we don't open it up.
    // Let's use custom "Admins can manage integrations" policy or just use admin client for all config ops.
    // Given the previous policy was "USING (false)", NO ONE can read. 
    // So we must use admin client here too.

    try {
        const { data, error } = await supabaseAdmin // Use Admin
            .from("integration_configs")
            .select("*")
            .eq("client_id", clientId)
            .eq("platform", "meta")
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
            console.error("Error fetching meta config:", error)
        }

        return { config: data }
    } catch (error) {
        return { error: "Error de servidor al obtener configuración" }
    }
}

export async function saveMetaConfig(clientId: string, formData: FormData) {
    // supabaseAdmin handles the bypass

    const accessToken = formData.get("access_token") as string
    const adAccountId = formData.get("ad_account_id") as string
    const pageId = formData.get("page_id") as string
    const isAdsEnabled = formData.get("show_ads") === "true"
    const isSocialEnabled = formData.get("show_social") === "true"

    if (!clientId) return { success: false, error: "Client ID required" }

    const configData = {
        client_id: clientId,
        platform: "meta",
        access_token: accessToken, // TODO: Implement encryption here in production
        ad_account_id: adAccountId,
        page_id: pageId,
        settings: {
            show_ads: isAdsEnabled,
            show_social: isSocialEnabled
        },
        updated_at: new Date().toISOString()
    }

    try {
        // Check if exists
        const { data: existing } = await supabaseAdmin // Use Admin
            .from("integration_configs")
            .select("id")
            .eq("client_id", clientId)
            .eq("platform", "meta")
            .single()

        let error;

        if (existing) {
            const { error: updateError } = await supabaseAdmin // Use Admin
                .from("integration_configs")
                .update(configData)
                .eq("id", existing.id)
            error = updateError
        } else {
            const { error: insertError } = await supabaseAdmin // Use Admin
                .from("integration_configs")
                .insert(configData)
            error = insertError
        }

        if (error) {
            console.error("Error saving meta config:", error)
            return { success: false, error: "Error al guardar configuración" }
        }

        revalidatePath(`/clients/${clientId}`)
        return { success: true }

    } catch (error) {
        console.error("Server error:", error)
        return { success: false, error: "Error inesperado" }
    }
}

export async function toggleMetaFeature(clientId: string, feature: 'show_ads' | 'show_social', value: boolean) {
    // supabaseAdmin handles the bypass

    try {
        const { data: config, error: fetchError } = await supabaseAdmin // Use Admin
            .from("integration_configs")
            .select("settings")
            .eq("client_id", clientId)
            .eq("platform", "meta")
            .single()

        if (fetchError) throw fetchError

        const currentSettings = config?.settings || {}
        const newSettings = { ...currentSettings, [feature]: value }

        const { error: updateError } = await supabaseAdmin // Use Admin
            .from("integration_configs")
            .update({ settings: newSettings })
            .eq("client_id", clientId)
            .eq("platform", "meta")

        if (updateError) throw updateError


        revalidatePath(`/clients/${clientId}`)
        return { success: true }

    } catch (error) {
        console.error("Error toggling feature:", error)
        return { success: false, error: "Error al actualizar estado" }
    }
}
