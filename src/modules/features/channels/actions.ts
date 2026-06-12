"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { requireOrgRole } from "@/modules/core/iam/services/org-roles"
import { revalidatePath } from "next/cache"
import { Channel, ChannelConfig } from "./types"

function sanitizeChannelCredentials(credentials: Record<string, any> | null | undefined) {
    if (!credentials || typeof credentials !== 'object') return {}

    return Object.fromEntries(
        Object.entries(credentials).map(([key, value]) => [`${key}_present`, Boolean(value)])
    )
}

function sanitizeChannelForClient(channel: Channel): Channel {
    return {
        ...channel,
        credentials: sanitizeChannelCredentials(channel.credentials),
    }
}

async function getChannelInternal(id: string): Promise<Channel | null> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return null

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('id', id)
        .eq('organization_id', orgId)
        .single()

    if (error) return null
    return data as Channel
}

/**
 * Get all channels for the current organization
 */
export async function getChannels(): Promise<Channel[]> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('organization_id', orgId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching channels:', error)
        return []
    }

    return (data as Channel[]).map(sanitizeChannelForClient)
}

/**
 * Get a specific channel by ID
 */
export async function getChannel(id: string): Promise<Channel | null> {
    const channel = await getChannelInternal(id)
    return channel ? sanitizeChannelForClient(channel) : null
}

/**
 * Get channel details handling Composite IDs (connectionId:assetId)
 */
export async function getChannelDetails(channelString: string): Promise<{ name: string, provider: string, iconType: 'whatsapp' | 'instagram' | 'messenger' | 'other' } | null> {
    if (!channelString || channelString === 'all') return null;

    let connectionId = channelString;
    let assetId: string | null = null;

    if (channelString.includes(':')) {
        [connectionId, assetId] = channelString.split(':');
    }

    const channel = await getChannel(connectionId);
    if (!channel) return null;

    let name = channel.connection_name;
    let provider = channel.provider_key;
    let iconType: 'whatsapp' | 'instagram' | 'messenger' | 'other' = 'other';

    // Determine basic icon type
    if (provider.includes('whatsapp') || provider.includes('evolution')) iconType = 'whatsapp';
    else if (provider.includes('instagram')) iconType = 'instagram';
    else if (provider === 'meta_business') iconType = 'messenger'; // Default to messenger for meta

    // If Composite ID, refine name and icon
    if (assetId && channel.metadata?.selected_assets) {
        const asset = channel.metadata.selected_assets.find((a: any) => String(a.id) === String(assetId));
        if (asset) {
            name = asset.name || 'Unknown Asset';
            // Refine Icon based on type
            if (asset.type === 'whatsapp') {
                iconType = 'whatsapp';
                name = `WhatsApp: ${name}`;
            } else if (asset.type === 'instagram') {
                iconType = 'instagram';
                name = `Instagram: ${name}`;
            } else {
                // Default to Messenger
                iconType = 'messenger';
                name = `Messenger: ${name}`;
            }
        }
    }

    return { name, provider, iconType };
}

import { integrationRegistry } from "@/modules/infrastructure/integrations/registry"

export async function checkChannelStatus(id: string) {
    const channel = await getChannelInternal(id)
    if (!channel) {
        return { status: 'error', message: 'Channel not found' }
    }

    const adapter = integrationRegistry.getAdapter(channel.provider_key)
    if (!adapter) {
        // No adapter registered for this provider - can't check status
        console.log(`[checkChannelStatus] No adapter for provider: ${channel.provider_key}`)
        return { status: 'unknown', message: `Provider ${channel.provider_key} has no health check` }
    }

    if (!adapter.checkConnectionStatus) {
        return { status: 'unknown', message: 'No health check available' }
    }

    try {
        return await adapter.checkConnectionStatus(channel.credentials)
    } catch (error: any) {
        console.error(`[checkChannelStatus] Error checking status:`, error)
        return { status: 'error', message: error.message }
    }
}

/**
 * Create a new channel (WhatsApp, Instagram, etc)
 */
export async function getChannelQrCode(providerKey: string, credentials: Record<string, any>) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Organization context required")

    await requireOrgRole('admin')

    const adapter = integrationRegistry.getAdapter(providerKey)
    if (!adapter) {
        throw new Error(`Provider ${providerKey} not found`)
    }

    if (!adapter.getQrCode) {
        return null
    }

    return await adapter.getQrCode(credentials)
}

export async function createChannel(input: {
    provider_key: string
    connection_name: string
    credentials: Record<string, any>
    config: ChannelConfig
    metadata?: Record<string, any>
    is_primary?: boolean
    force_validation?: boolean // Optional: skip validation if needed, default false
}) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Organization context required")

    await requireOrgRole('admin') // Only admins can connect lines

    // 1. Verify Credentials
    if (input.force_validation !== false) {
        const adapter = integrationRegistry.getAdapter(input.provider_key)
        if (!adapter) {
            throw new Error(`Provider ${input.provider_key} not found`)
        }

        const verification = await adapter.verifyCredentials(input.credentials)
        if (!verification.isValid) {
            throw new Error(verification.error || "Invalid credentials")
        }

        // Merge metadata from verification (e.g. verified name, display number)
        input.metadata = { ...input.metadata, ...verification.metadata }
    }

    const supabase = await createClient()

    // If new channel is primary, unset other primaries first
    if (input.is_primary) {
        await supabaseAdmin
            .from('integration_connections')
            .update({ is_primary: false })
            .eq('organization_id', orgId)
            .eq('provider_key', input.provider_key)
    }

    const { data, error } = await supabase
        .from('integration_connections')
        .insert({
            organization_id: orgId,
            provider_key: input.provider_key,
            connection_name: input.connection_name,
            credentials: input.credentials,
            config: input.config,
            metadata: input.metadata || {},
            is_primary: input.is_primary || false,
            status: 'active'
        })
        .select()
        .single()

    if (error) throw new Error(error.message)

    revalidatePath('/crm/settings/channels')
    return sanitizeChannelForClient(data as Channel)
}

/**
 * Update channel configuration
 */
export async function updateChannel(channelId: string, updates: Partial<Channel>) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Unauthorized")

    await requireOrgRole('admin')

    const supabase = await createClient()

    // Protected fields that cannot be updated directly via this action
    delete (updates as any).id
    delete (updates as any).organization_id
    delete (updates as any).created_at
    delete (updates as any).provider_key // Managing provider type shouldn't change
    delete (updates as any).credentials

    // If setting as primary, handle exclusivity
    if (updates.is_primary) {
        // Get the channel first to know provider
        const { data: current } = await supabaseAdmin
            .from('integration_connections')
            .select('provider_key')
            .eq('id', channelId)
            .single()

        if (current) {
            await supabaseAdmin
                .from('integration_connections')
                .update({ is_primary: false })
                .eq('organization_id', orgId)
                .eq('provider_key', current.provider_key)
        }
    }

    const { data, error } = await supabase
        .from('integration_connections')
        .update(updates)
        .eq('id', channelId)
        .eq('organization_id', orgId) // Extra safety
        .select()
        .single()

    if (error) throw new Error(error.message)

    revalidatePath('/crm/settings/channels')
    return sanitizeChannelForClient(data as Channel)
}

/**
 * Delete a channel
 * For Evolution channels: also deletes the instance if disconnected
 */
export async function deleteChannel(channelId: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Unauthorized")

    await requireOrgRole('admin')

    // Get channel details first to check if Evolution
    const { data: channel } = await supabaseAdmin
        .from('integration_connections')
        .select('*')
        .eq('id', channelId)
        .eq('organization_id', orgId)
        .single()

    if (!channel) {
        throw new Error("Channel not found")
    }

    // First try hard delete
    const { error } = await supabaseAdmin
        .from('integration_connections')
        .delete()
        .eq('id', channelId)
        .eq('organization_id', orgId)

    if (error) {
        console.log('[deleteChannel] Hard delete failed, trying soft delete:', error.message)

        // If FK constraint, do soft delete (set status to 'deleted')
        const { error: softError } = await supabaseAdmin
            .from('integration_connections')
            .update({ status: 'deleted' })
            .eq('id', channelId)
            .eq('organization_id', orgId)

        if (softError) {
            console.error('[deleteChannel] Soft delete also failed:', softError)
            throw new Error("Failed to delete: " + softError.message)
        }

        console.log('[deleteChannel] Soft deleted successfully')
    }

    revalidatePath('/crm/settings/channels')
    return true
}




