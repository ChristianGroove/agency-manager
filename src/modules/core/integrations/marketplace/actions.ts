"use server"

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { requireOrgRole } from "@/lib/auth/org-roles"
import { revalidatePath } from "next/cache"
import { IntegrationProvider, InstalledIntegration } from "./types"
import { integrationRegistry } from "../registry"

/**
 * Get all available providers from the marketplace
 */
export async function getMarketplaceProviders(category?: string): Promise<IntegrationProvider[]> {
    const supabase = await createClient()

    let query = supabase
        .from('integration_providers')
        .select('*')
        .eq('is_enabled', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true })

    if (category && category !== 'all') {
        query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
        console.error('[Marketplace] Error fetching providers:', error)
        return []
    }

    return data as IntegrationProvider[]
}

/**
 * Get a single provider by key
 */
export async function getProviderByKey(key: string): Promise<IntegrationProvider | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('integration_providers')
        .select('*')
        .eq('key', key)
        .single()

    if (error) return null
    return data as IntegrationProvider
}

/**
 * Get installed integrations for current organization
 */
export async function getInstalledIntegrations(): Promise<InstalledIntegration[]> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('integration_connections')
        .select('*, integration_providers(*)')
        .eq('organization_id', orgId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('[Marketplace] Error fetching installed integrations:', error)
        return []
    }

    return (data as any[]).map(conn => ({
        ...conn,
        provider: conn.integration_providers
    })) as InstalledIntegration[]
}

/**
 * Install a new integration from the marketplace
 */
export async function installIntegration(input: {
    providerKey: string
    connectionName: string
    credentials: Record<string, any>
    config?: Record<string, any>
}): Promise<{ success: boolean; connectionId?: string; error?: string }> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: 'No organization context' }

    // Clean credentials (trim whitespace) to prevent ID mismatches
    const cleanCredentials: Record<string, any> = {}
    if (input.credentials) {
        Object.entries(input.credentials).forEach(([key, value]) => {
            if (typeof value === 'string') {
                cleanCredentials[key] = value.trim()
            } else {
                cleanCredentials[key] = value
            }
        })
    }
    // Update input to use cleaned credentials
    input.credentials = cleanCredentials

    await requireOrgRole('admin')

    const supabase = await createClient()

    // 1. Get provider
    const { data: provider } = await supabase
        .from('integration_providers')
        .select('*')
        .eq('key', input.providerKey)
        .single()

    if (!provider) {
        return { success: false, error: 'Provider not found' }
    }

    // 2. Validate credentials using adapter
    const adapter = integrationRegistry.getAdapter(input.providerKey)
    if (adapter) {
        const verification = await adapter.verifyCredentials(input.credentials)
        if (!verification.isValid) {
            return { success: false, error: verification.error || 'Invalid credentials' }
        }
    }

    // 3. Check if already installed (by provider_key OR legacy key)
    const LEGACY_KEYS: Record<string, string> = {
        'meta_whatsapp': 'whatsapp',
        'evolution_api': 'evolution'
    }
    const legacyKey = LEGACY_KEYS[input.providerKey]

    let query = supabase
        .from('integration_connections')
        .select('id, provider_key')
        .eq('organization_id', orgId)
        .neq('status', 'deleted')

    if (legacyKey) {
        query = query.in('provider_key', [input.providerKey, legacyKey])
    } else {
        query = query.eq('provider_key', input.providerKey)
    }

    const { data: existingConnections } = await query

    // Prefer the one with the correct key, or fallback to legacy
    const existing = existingConnections?.find(c => c.provider_key === input.providerKey) || existingConnections?.[0]

    if (existing) {
        // Prepare update data
        const updateData: any = {
            connection_name: input.connectionName,
            credentials: input.credentials,
            config: input.config || {},
            status: 'active',
            last_synced_at: new Date().toISOString()
        }

        // If it was a legacy key, migrate it!
        if (existing.provider_key !== input.providerKey) {
            updateData.provider_key = input.providerKey
            // Also link the correct provider_id
            updateData.provider_id = provider.id
        }

        // Update existing instead of creating new
        const { error: updateError } = await supabase
            .from('integration_connections')
            .update(updateData)
            .eq('id', existing.id)

        if (updateError) {
            return { success: false, error: updateError.message }
        }

        revalidatePath('/platform/integrations')
        return { success: true, connectionId: existing.id }
    }

    // 4. Create new connection
    const { data: newConn, error: insertError } = await supabase
        .from('integration_connections')
        .insert({
            organization_id: orgId,
            provider_id: provider.id,
            provider_key: input.providerKey,
            connection_name: input.connectionName,
            credentials: input.credentials,
            config: input.config || {},
            metadata: {},
            status: 'active',
            is_primary: false
        })
        .select('id')
        .single()

    if (insertError) {
        return { success: false, error: insertError.message }
    }

    revalidatePath('/platform/integrations')
    return { success: true, connectionId: newConn.id }
}

/**
 * Uninstall an integration (soft delete)
 */
export async function uninstallIntegration(connectionId: string): Promise<{ success: boolean; error?: string }> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: 'No organization context' }

    await requireOrgRole('admin')

    const supabase = await createClient()

    const { error } = await supabase
        .from('integration_connections')
        .update({ status: 'deleted' })
        .eq('id', connectionId)
        .eq('organization_id', orgId)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/platform/integrations')
    return { success: true }
}

/**
 * Get marketplace stats for dashboard
 */
export async function getMarketplaceStats(): Promise<{
    totalProviders: number
    installedCount: number
    byCategory: Record<string, number>
}> {
    const orgId = await getCurrentOrganizationId()
    const supabase = await createClient()

    // Total available
    const { count: totalProviders } = await supabase
        .from('integration_providers')
        .select('*', { count: 'exact', head: true })
        .eq('is_enabled', true)

    // Installed for org
    let installedCount = 0
    if (orgId) {
        const { count } = await supabase
            .from('integration_connections')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .neq('status', 'deleted')
        installedCount = count || 0
    }

    // By category
    const { data: providers } = await supabase
        .from('integration_providers')
        .select('category')
        .eq('is_enabled', true)

    const byCategory: Record<string, number> = {}
    if (providers) {
        for (const p of providers) {
            byCategory[p.category] = (byCategory[p.category] || 0) + 1
        }
    }

    return {
        totalProviders: totalProviders || 0,
        installedCount,
        byCategory
    }
}
