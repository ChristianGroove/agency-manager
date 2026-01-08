"use server"

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { encrypt } from "./encryption"
import { revalidatePath } from "next/cache"
import { AICredential } from "./types"

/**
 * Get all credentials for the current org (Masked)
 */
/**
 * Get all credentials for the current org (Masked)
 * Allow explicit organizationId for background tasks
 */
export async function getAICredentials(organizationId?: string) {
    const orgId = organizationId || await getCurrentOrganizationId()
    if (!orgId) return []

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('ai_credentials')
        .select('*, provider:ai_providers(name, logo_url)')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('priority', { ascending: true })

    if (error) {
        console.error('Error fetching AI credentials:', error)
        return []
    }

    // Return with masked keys
    return data.map((cred: any) => ({
        ...cred,
        api_key_encrypted: '●●●●●●●●', // Masked for UI
        providerName: cred.provider?.name,
        providerLogo: cred.provider?.logo_url
    }))
}

/**
 * Get available providers catalog
 */
import { supabaseAdmin } from "@/lib/supabase-admin"

// ...

/**
 * Get available providers catalog
 */
export async function getAIProviders() {
    // Use Admin client to bypass RLS for public catalog
    const { data } = await supabaseAdmin.from('ai_providers').select('*')
    return data || []
}


/**
 * Add a new AI API Key
 */
export async function addAICredential(providerId: string, apiKey: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Unauthorized")

    // 1. Encrypt Key
    const encryptedKey = encrypt(apiKey)

    // 2. Determine Priority (Append to end)
    const supabase = await createClient()
    const { count } = await supabase.from('ai_credentials').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
    const priority = (count || 0) + 1

    // 3. Insert
    const { error } = await supabase.from('ai_credentials').insert({
        organization_id: orgId,
        provider_id: providerId,
        api_key_encrypted: encryptedKey,
        priority,
        status: 'active'
    })

    if (error) throw error

    revalidatePath('/platform/settings')
    return { success: true }
}

/**
 * Delete a credential
 */
export async function deleteAICredential(id: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Unauthorized")

    const supabase = await createClient()
    const { error } = await supabase
        .from('ai_credentials')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) throw error
    revalidatePath('/platform/settings')
    return { success: true }
}
