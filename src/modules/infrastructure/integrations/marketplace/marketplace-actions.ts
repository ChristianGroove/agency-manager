"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { requireOrgRole } from "@/modules/core/iam/services/org-roles"
import { revalidatePath } from "next/cache"
import { headers } from 'next/headers'
import { IntegrationProvider, InstalledIntegration, BUILTIN_PROVIDERS } from "./types"
import { integrationRegistry } from "../registry"
import { encryptObject } from '@/modules/infrastructure/integrations/encryption'
import { assertRawCredentialInput, resolveConnectionCredentials } from '@/modules/infrastructure/integrations/connection-secrets'
import { issueMetaOAuthSession } from "@/modules/infrastructure/meta/services/oauth-session"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV
}

function summarizeMarketplaceError(error: unknown) {
    return error instanceof Error
        ? { name: error.name }
        : { type: typeof error }
}

function logMarketplaceError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizeMarketplaceError(error))
}

function publicMarketplaceError(error: unknown, fallback: string) {
    if (isDeployedRuntime()) {
        return fallback
    }

    return error instanceof Error
        ? error.message
        : fallback
}

function sanitizeInstalledCredentials(credentials: Record<string, any> | null | undefined) {
    if (!credentials || typeof credentials !== 'object') return {}

    return Object.fromEntries(
        Object.entries(credentials).map(([key, value]) => [`${key}_present`, Boolean(value)])
    )
}

async function assertCanManageIntegrations() {
    try {
        const { hasPermission } = await import('@/modules/core/iam/services/role-service')
        const { PERMISSIONS } = await import('@/modules/core/iam/actions/permissions')
        const allowed = await hasPermission(PERMISSIONS.ORG.MANAGE_INTEGRATIONS).catch(() => false)
        if (allowed) return
    } catch {
        // Fallback to role-based check
    }
    await requireOrgRole('admin')
}

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

    let providers: IntegrationProvider[] = (data as IntegrationProvider[]) || []

    // Ensure built-in providers (e.g. Bitbucket) are included even if not yet seeded in DB
    for (const builtin of BUILTIN_PROVIDERS) {
        if (!providers.some(p => p.key === builtin.key)) {
            if (!category || category === 'all' || category === builtin.category) {
                providers.push(builtin)
            }
            // Background self-heal: attempt to persist to DB so future relations/lookups find it
            try {
                const target = supabase.from('integration_providers')
                if (typeof (target as any)?.upsert === 'function') {
                    (target as any).upsert({
                        key: builtin.key,
                        name: builtin.name,
                        description: builtin.description,
                        category: builtin.category,
                        icon_url: builtin.icon_url,
                        is_premium: builtin.is_premium,
                        is_enabled: builtin.is_enabled,
                        config_schema: builtin.config_schema
                    }, { onConflict: 'key' }).then(() => {}).catch(() => {})
                }
            } catch {
                // Ignore self-heal background error
            }
        }
    }

    if (error && providers.length === 0) {
        logMarketplaceError('[Marketplace] Error fetching providers:', error)
        return []
    }

    return providers
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

    if (error || !data) {
        const builtin = BUILTIN_PROVIDERS.find(p => p.key === key)
        if (builtin) return builtin
        return null
    }
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
        logMarketplaceError('[Marketplace] Error fetching installed integrations:', error)
        return []
    }

    return (data as any[]).map(conn => ({
        ...conn,
        credentials: sanitizeInstalledCredentials(conn.credentials),
        provider: conn.integration_providers || BUILTIN_PROVIDERS.find(p => p.key === conn.provider_key)
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

    assertRawCredentialInput(input.credentials || {})
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

    await assertCanManageIntegrations()

    const supabase = await createClient()

    // 1. Get provider
    let { data: provider } = await supabase
        .from('integration_providers')
        .select('*')
        .eq('key', input.providerKey)
        .single()

    if (!provider) {
        const builtin = BUILTIN_PROVIDERS.find(p => p.key === input.providerKey)
        if (builtin) {
            const { data: inserted } = await supabase
                .from('integration_providers')
                .upsert({
                    key: builtin.key,
                    name: builtin.name,
                    description: builtin.description,
                    category: builtin.category,
                    icon_url: builtin.icon_url,
                    is_premium: builtin.is_premium,
                    is_enabled: builtin.is_enabled,
                    config_schema: builtin.config_schema
                }, { onConflict: 'key' })
                .select('*')
                .single()
            provider = inserted || builtin
        }
    }

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
            updateData.credentials = encryptObject(input.credentials)
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
            .eq('organization_id', orgId)

        if (updateError) {
            logMarketplaceError('[Marketplace] Error updating integration:', updateError)
            return { success: false, error: publicMarketplaceError(updateError, 'Integration install failed') }
        }

        if (adapter?.onConnect) {
            try {
                await adapter.onConnect(existing.id, input.credentials || {})
            } catch (e) {
                console.warn('[Marketplace] onConnect failed on update:', e)
            }
        }

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
            credentials: encryptObject(input.credentials || {}),
            config: input.config || {},
            metadata: input.metadata || {},
            status: input.status || 'active',
            is_primary: false
        })
        .select('id')
        .single()


    if (insertError) {
        logMarketplaceError('[Marketplace] Error installing integration:', insertError)
        return { success: false, error: publicMarketplaceError(insertError, 'Integration install failed') }
    }

    if (adapter?.onConnect && newConn?.id) {
        try {
            await adapter.onConnect(newConn.id, input.credentials || {})
        } catch (e) {
            console.warn('[Marketplace] onConnect failed on create:', e)
        }
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

    await assertCanManageIntegrations()

    const supabase = await createClient()

    const { data: conn } = await supabase
        .from('integration_connections')
        .select('provider_key, credentials, metadata')
        .eq('id', connectionId)
        .eq('organization_id', orgId)
        .single()

    if (conn) {
        const adapter = integrationRegistry.getAdapter(conn.provider_key)
        if (adapter?.onDisconnect) {
            try {
                const creds = await resolveConnectionCredentials(conn.credentials).catch(() => ({}))
                await adapter.onDisconnect(connectionId, { ...creds, metadata: conn.metadata })
            } catch (e) {
                console.warn('[Marketplace] onDisconnect failed:', e)
            }
        }
    }

    const { error } = await supabase
        .from('integration_connections')
        .update({ status: 'deleted' })
        .eq('id', connectionId)
        .eq('organization_id', orgId)

    if (error) {
        logMarketplaceError('[Marketplace] Error uninstalling integration:', error)
        return { success: false, error: publicMarketplaceError(error, 'Integration uninstall failed') }
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
 * @param channelType - Optional social or Ads channel for granular connection.
 *                      If provided, limits the OAuth to only that channel type
 */
export async function getMetaAuthUrl(channelType?: 'messenger' | 'instagram' | 'ads'): Promise<string> {
    if (channelType && !['messenger', 'instagram', 'ads'].includes(channelType)) {
        throw new Error('Use Embedded Signup for WhatsApp')
    }
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No organization context")

    // State includes orgId and optional channelType for filtering in callback
    // The opaque, one-time state is bound to the authenticated tenant session.
    const state = await issueMetaOAuthSession(orgId, { channelType, flow: "org" });

    const CLIENT_ID = process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID || '25468410932828305';
    if (isDeployedRuntime() && !process.env.NEXT_PUBLIC_APP_URL) {
        throw new Error('Meta callback URL is not configured')
    }
    const requestOrigin = (await headers()).get('origin')
    const localOrigin = !isDeployedRuntime() && requestOrigin
        && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(requestOrigin) ? requestOrigin : null
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || localOrigin || 'http://localhost:3000';
    console.log(`[Meta OAuth] BASE_URL resolved to: ${appUrl}`);
    const REDIRECT_URI = `${appUrl}/api/integrations/meta/callback`;

    console.log('[Meta OAuth] Generating URL with Redirect URI:', REDIRECT_URI);

    // Scopes based on channel type
    // For granular connections, request only the necessary scopes
    let scopes: string[];

    switch (channelType) {
        case 'ads':
            scopes = [
                'public_profile',
                'ads_read',
                'pages_show_list'
            ];
            break;
        case 'messenger':
            scopes = [
                'public_profile',
                'pages_show_list',
                'pages_read_engagement',
                'pages_manage_metadata',
                'pages_messaging'
            ];
            break;
        case 'instagram':
            scopes = [
                'public_profile',
                'instagram_basic',
                'instagram_manage_messages',
                'pages_show_list',
                'pages_read_engagement',
                'pages_manage_metadata'
            ];
            break;
        default:
            // The Integraciones page authorizes social channels only.
            scopes = [
                'public_profile',
                'instagram_basic',
                'instagram_manage_messages',
                'pages_show_list',
                'pages_read_engagement',
                'pages_manage_metadata',
                'pages_messaging'
            ];
    }

    const finalUrl = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}&scope=${scopes.join(',')}&response_type=code`;

    return finalUrl;
}
