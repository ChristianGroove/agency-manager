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

import { integrationRegistry } from "@/modules/core/integrations/registry"

export async function checkChannelStatus(id: string) {
    const channel = await getChannel(id)
    if (!channel) throw new Error("Channel not found")

    const adapter = integrationRegistry.getAdapter(channel.provider_key)
    if (!adapter) throw new Error("Adapter not found")

    if (!adapter.checkConnectionStatus) {
        return { status: 'unknown' }
    }

    return await adapter.checkConnectionStatus(channel.credentials)
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
 */
export async function deleteChannel(channelId: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Unauthorized")

    await requireOrgRole('admin')

    const supabase = await createClient()
    const { error } = await supabase
        .from('integration_connections')
        .delete()
        .eq('id', channelId)
        .eq('organization_id', orgId)

    if (error) throw new Error(error.message)

    revalidatePath('/crm/settings/channels')
    return true
}
