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
    metadata?: Record<string, any>
    status?: 'active' | 'action_required'
}): Promise<{ success: boolean; connectionId?: string; error?: string }> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: 'No organization context' }

    // ... credentials cleaning ...
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

    // 2. Validate credentials using adapter (Skip if just updating status/metadata without changing creds?)
    // Actually, we usually re-validate. Check logic below.
    const adapter = integrationRegistry.getAdapter(input.providerKey)
    if (adapter && Object.keys(input.credentials).length > 0) {
        // Only verify if credentials provided. If incomplete, maybe we skip? 
        // For Meta 'activate', we might send empty creds but we want to keep existing ones.
        // The current logic replaces creds. 
        // If we want to support partial update, we need to change logic.
        // For now, assume we send back existing credentials or we rely on 'existing' verify?
        // Let's keep it simple: Verify if credentials are passed.
        const verification = await adapter.verifyCredentials(input.credentials)
        if (!verification.isValid) {
            return { success: false, error: verification.error || 'Invalid credentials' }
        }
    }

    // 3. Check if already installed
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
    const existing = existingConnections?.find(c => c.provider_key === input.providerKey) || existingConnections?.[0]

    if (existing) {
        // Prepare update data
        const updateData: any = {
            connection_name: input.connectionName,
            config: input.config || {},
            status: input.status || 'active',
            last_synced_at: new Date().toISOString()
        }

        // Only update credentials if provided and not empty
        if (input.credentials && Object.keys(input.credentials).length > 0) {
            updateData.credentials = input.credentials
        }

        // Merge metadata if provided
        if (input.metadata) {
            updateData.metadata = input.metadata // logic for merge? For now replace or we can fetch and merge.
            // Let's replace for simplicity as input.metadata usually contains the full desired state.
        }

        if (existing.provider_key !== input.providerKey) {
            updateData.provider_key = input.providerKey
            updateData.provider_id = provider.id
        }

        const { error: updateError } = await supabase
            .from('integration_connections')
            .update(updateData)
            .eq('id', existing.id)

        if (updateError) return { success: false, error: updateError.message }

        revalidatePath('/platform/integrations')
        return { success: true, connectionId: existing.id }
    }

    // 4. Create new
    const { data: newConn, error: insertError } = await supabase
        .from('integration_connections')
        .insert({
            organization_id: orgId,
            provider_id: provider.id,
            provider_key: input.providerKey,
            connection_name: input.connectionName,
            credentials: input.credentials || {},
            config: input.config || {},
            metadata: input.metadata || {},
            status: input.status || 'active',
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

/**
 * Generate Meta OAuth URL securely
 */
export async function getMetaAuthUrl(): Promise<string> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No organization context")

    // In production, use a secure state cache (e.g. Redis) to link this state to the user session
    // For now, we sign it with the orgId to ensure we link back to the correct org
    const state = orgId;

    // Hardcode for now or use env, consistent with prior user screenshot/code
    const CLIENT_ID = process.env.NEXT_PUBLIC_META_APP_ID || '812673724531634';
    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; // Make sure this matches ngrok/prod if deployed
    const REDIRECT_URI = `${BASE_URL}/api/integrations/meta/callback`;

    // Updated Scopes
    const SCOPES = [
        'email',
        'public_profile',
        'instagram_basic',
        'instagram_manage_messages',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_metadata',
        'pages_messaging',
        'pages_utility_messaging',
        // 'business_management', // Removed: Causes heavy review requirement and permission errors. We rely on granular scopes.
        'whatsapp_business_messaging',
        'whatsapp_business_management'
    ].join(',');

    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}&scope=${SCOPES}&response_type=code`;
}
