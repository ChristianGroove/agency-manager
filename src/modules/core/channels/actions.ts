"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { requireOrgRole } from "@/lib/auth/org-roles"
import { revalidatePath } from "next/cache"
import { Channel, ChannelConfig } from "./types"

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

    return data as Channel[]
}

/**
 * Get a specific channel by ID
 */
export async function getChannel(id: string): Promise<Channel | null> {
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

import { integrationRegistry } from "@/modules/core/integrations/registry"

export async function checkChannelStatus(id: string) {
    const channel = await getChannel(id)
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
    return data as Channel
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
    return data as Channel
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

    // If Evolution channel, try to cleanup instance
    if (channel.provider_key === 'evolution_api') {
        const instanceName = channel.credentials?.instanceName
        if (instanceName) {
            try {
                const adapter = new EvolutionAdapter()

                // Check instance state
                const instanceInfo = await adapter.fetchInstance(instanceName)

                // Only delete instance if it exists and is NOT actively connected
                if (instanceInfo.exists && instanceInfo.state !== 'open') {
                    console.log(`[deleteChannel] Deleting Evolution instance: ${instanceName}`)
                    await adapter.deleteInstance(instanceName)
                } else if (instanceInfo.exists && instanceInfo.state === 'open') {
                    console.log(`[deleteChannel] Instance ${instanceName} is still connected, only soft deleting channel`)
                }
            } catch (err) {
                console.error('[deleteChannel] Error cleaning up instance:', err)
                // Continue with channel deletion even if instance cleanup fails
            }
        }
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

/**
 * Helper: Get channel by instance name (includes deleted for reconnection)
 */
async function getChannelByInstanceName(instanceName: string, orgId: string): Promise<Channel | null> {
    const { data } = await supabaseAdmin
        .from('integration_connections')
        .select('*')
        .eq('organization_id', orgId)
        .eq('provider_key', 'evolution_api')
        // Don't filter by status - allow finding deleted channels for reconnection
        .order('created_at', { ascending: false })

    if (!data) return null

    // Find channel with matching instance name in credentials
    const channel = data.find(c => c.credentials?.instanceName === instanceName)
    return channel as Channel | null
}

/**
 * ORCHESTRATOR: Smart WhatsApp Channel Connection
 * 
 * Flow:
 * 1. Check if instance exists in Evolution
 * 2. If exists + belongs to this org → reconnect (get QR)
 * 3. If exists + different org → error
 * 4. If not exists → create new instance
 */
import { EvolutionAdapter } from "@/modules/core/integrations/adapters/evolution-adapter"

export async function createWhatsAppChannel(phoneNumber: string): Promise<{ channelId: string; qrCode?: string; reconnected?: boolean }> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Unauthorized")

    await requireOrgRole('admin')

    // 1. Generate Secure Instance Name: "org_{shortId}_{phone}"
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '')
    const orgPrefix = orgId.split('-')[0]
    const instanceName = `org_${orgPrefix}_${cleanPhone}`

    const adapter = new EvolutionAdapter()
    const globalUrl = process.env.EVOLUTION_API_URL || "http://localhost:8080"

    // 2. Check if instance already exists
    const instanceInfo = await adapter.fetchInstance(instanceName)
    console.log(`[createWhatsAppChannel] Instance ${instanceName} exists:`, instanceInfo.exists, 'state:', instanceInfo.state)

    if (instanceInfo.exists) {
        // Instance exists - check if we own it
        const instanceOwnerPrefix = instanceName.split('_')[1]

        if (instanceOwnerPrefix !== orgPrefix) {
            // Different org owns this instance (shouldn't happen with naming, but safety check)
            throw new Error("Este número ya está en uso por otra organización")
        }

        // Check if we have a channel record for this instance
        const existingChannel = await getChannelByInstanceName(instanceName, orgId)

        if (existingChannel) {
            // We have a channel record - check if it's active and connected
            if (existingChannel.status === 'active' && instanceInfo.state === 'open') {
                throw new Error("Este número ya está conectado como canal activo")
            }

            // Channel exists but disconnected - get QR to reconnect
            console.log(`[createWhatsAppChannel] Reconnecting existing channel ${existingChannel.id}`)

            const qrResult = await adapter.getQrCode({
                baseUrl: globalUrl,
                apiKey: existingChannel.credentials?.apiKey || process.env.EVOLUTION_API_KEY,
                instanceName: instanceName
            })

            // Update channel status if it was marked as deleted
            if (existingChannel.status === 'deleted') {
                await supabaseAdmin
                    .from('integration_connections')
                    .update({ status: 'active' })
                    .eq('id', existingChannel.id)
            }

            return {
                channelId: existingChannel.id,
                qrCode: qrResult?.qr,
                reconnected: true
            }
        }

        // Instance exists in Evolution but no channel in DB
        // This could be orphaned instance - try to get QR and create channel record
        console.log(`[createWhatsAppChannel] Creating channel for existing instance ${instanceName}`)

        const qrResult = await adapter.getQrCode({
            baseUrl: globalUrl,
            apiKey: instanceInfo.token || process.env.EVOLUTION_API_KEY,
            instanceName: instanceName
        })

        // Save channel to DB
        const saveInput = {
            provider_key: 'evolution_api',
            connection_name: `WhatsApp (${cleanPhone})`,
            credentials: {
                baseUrl: globalUrl,
                apiKey: instanceInfo.token || process.env.EVOLUTION_API_KEY,
                instanceName: instanceName
            },
            config: {
                instance_id: instanceName,
                base_url: globalUrl
            },
            metadata: {
                phone_number: cleanPhone
            }
        }

        const channel = await createChannel(saveInput)

        return {
            channelId: channel.id,
            qrCode: qrResult?.qr,
            reconnected: true
        }
    }

    // 3. Instance does not exist - create new one
    console.log(`[createWhatsAppChannel] Creating new instance ${instanceName}`)

    const secureToken = crypto.randomUUID().replace(/-/g, '')
    const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`
        : undefined

    try {
        const result = await adapter.createInstance({
            instanceName,
            token: secureToken,
            qrcode: true,
            webhook: webhookUrl
        })

        // Save to DB
        const saveInput = {
            provider_key: 'evolution_api',
            connection_name: `WhatsApp (${cleanPhone})`,
            credentials: {
                baseUrl: globalUrl,
                apiKey: result.token || secureToken,
                instanceName: instanceName
            },
            config: {
                instance_id: instanceName,
                base_url: globalUrl
            },
            metadata: {
                phone_number: cleanPhone
            }
        }

        const channel = await createChannel(saveInput)

        return {
            channelId: channel.id,
            qrCode: result.qr
        }

    } catch (error: any) {
        console.error('[createWhatsAppChannel] Provision failed:', error)

        // If error is still "already exists", provide clearer message
        if (error.message?.includes("already") || error.message?.includes("in use")) {
            throw new Error("Este número ya está registrado. Por favor contacta soporte si crees que es un error.")
        }

        throw new Error("Error al crear canal WhatsApp: " + error.message)
    }
}

