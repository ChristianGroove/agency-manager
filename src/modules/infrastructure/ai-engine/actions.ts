"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { encrypt } from "./encryption"
import { revalidatePath } from "next/cache"
import { AICredential } from "./types"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV
}

function logAICredentialError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error })
}

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
        logAICredentialError('Error fetching AI credentials:', error)
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

// ...

/**
 * Get available providers catalog
 */
export async function getAIProviders() {
    // Use Admin client to bypass RLS for public catalog
    const { data } = await (await createClient()).from('ai_providers').select('*')
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

/**
 * Update priority order for a batch of credentials
 */
export async function updateAICredentialPriority(items: { id: string; priority: number }[]) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Unauthorized")

    const supabase = await createClient()

    // Step 1: Temporarily negate priorities to avoid UNIQUE constraint conflicts during swap
    for (let i = 0; i < items.length; i++) {
        await supabase
            .from('ai_credentials')
            .update({ priority: -(i + 100) })
            .eq('id', items[i].id)
            .eq('organization_id', orgId)
    }

    // Step 2: Set final positive priorities
    for (const item of items) {
        await supabase
            .from('ai_credentials')
            .update({ priority: item.priority })
            .eq('id', item.id)
            .eq('organization_id', orgId)
    }

    revalidatePath('/platform/settings')
    revalidatePath('/platform/integrations')
    return { success: true }
}

export interface TenantAIGovernanceContext {
    aiMode: 'byok' | 'saas' | 'disabled'
    aiStatus: 'active' | 'suspended'
    monthlyLimit: number
    currentUsage: number
    activeMasterKeysCount: number
}

/**
 * Get AI governance status, mode, and usage for current tenant context
 */
export async function getTenantAIGovernanceContext(organizationId?: string): Promise<TenantAIGovernanceContext> {
    const orgId = organizationId || await getCurrentOrganizationId()
    if (!orgId) {
        return {
            aiMode: 'byok',
            aiStatus: 'active',
            monthlyLimit: 100000,
            currentUsage: 0,
            activeMasterKeysCount: 0
        }
    }

    // 1. Fetch organization rate_limit_config and status using supabaseAdmin to ensure system access
    const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('status, rate_limit_config')
        .eq('id', orgId)
        .maybeSingle()

    const config = (org?.rate_limit_config as Record<string, any>) || {}
    const aiMode: 'byok' | 'saas' | 'disabled' = config.ai_mode || 'byok'
    const aiStatus: 'active' | 'suspended' = config.ai_status || (org?.status === 'suspended' ? 'suspended' : 'active')

    // 2. Fetch monthly limit from usage_limits (default 100k)
    const { data: limitData } = await supabaseAdmin
        .from('usage_limits')
        .select('limit_value')
        .eq('organization_id', orgId)
        .eq('engine', 'ai')
        .eq('period', 'month')
        .maybeSingle()

    const monthlyLimit = limitData?.limit_value !== undefined ? limitData.limit_value : 100000

    // 3. Fetch current monthly usage from usage_counters
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().split('T')[0]

    const { data: counter } = await supabaseAdmin
        .from('usage_counters')
        .select('used')
        .eq('organization_id', orgId)
        .eq('engine', 'ai')
        .eq('period', 'month')
        .eq('period_start', monthStart)
        .maybeSingle()

    const currentUsage = counter?.used || 0

    // 4. Fetch master keys count in SaaS mode
    let activeMasterKeysCount = 0
    if (aiMode === 'saas') {
        const { data: globalSettings } = await supabaseAdmin
            .from('ai_settings')
            .select('model_overrides')
            .eq('scope_type', 'global')
            .eq('scope_id', 'system')
            .maybeSingle()

        const masterKeys = (globalSettings?.model_overrides as any)?.master_keys
        if (Array.isArray(masterKeys)) {
            activeMasterKeysCount = masterKeys.filter((k: any) => k && k.status !== 'inactive').length
        } else if (masterKeys && typeof masterKeys === 'object') {
            activeMasterKeysCount = Object.keys(masterKeys).length
        }
    }

    return {
        aiMode,
        aiStatus,
        monthlyLimit,
        currentUsage,
        activeMasterKeysCount
    }
}


