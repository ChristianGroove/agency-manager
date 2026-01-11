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
 */
export async function deleteChannel(channelId: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Unauthorized")

    await requireOrgRole('admin')

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
 * ORCHESTRATOR: Automatic WhatsApp Channel Creation
 * 1. Generates secure Instance Name
 * 2. Provisions Evolution API Instance
 * 3. Saves Connection to DB
 * 4. Returns QR Code immediately
 */
import { EvolutionAdapter } from "@/modules/core/integrations/adapters/evolution-adapter"

export async function createWhatsAppChannel(phoneNumber: string): Promise<{ channelId: string; qrCode?: string }> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Unauthorized")

    await requireOrgRole('admin')

    // 1. Generate Secure Instance Name: "org_{shortId}_{phone}"
    // Clean phone number: remove + and spaces
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '')
    const instanceName = `org_${orgId.split('-')[0]}_${cleanPhone}`

    // 2. Provision Instance
    const adapter = new EvolutionAdapter()

    // We can define a secure token for this instance, or let Evolution generate one
    // Let's generate one for DB storage
    const secureToken = crypto.randomUUID().replace(/-/g, '')

    // Construct Webhook URL (Dynamic based on current host - need env or hardcode relative?)
    // Webhooks usually need public URL. 
    // Ideally: process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/whatsapp'
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

        // 3. Save to DB
        // We need global URL for reference or future usage
        const globalUrl = process.env.EVOLUTION_API_URL || "http://localhost:8080"

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

        // 4. Return result
        return {
            channelId: channel.id,
            qrCode: result.qr // Base64 string if returned immediately
        }

    } catch (error: any) {
        console.error('[createWhatsAppChannel] Provision failed:', error)

        // Check if error is "Instance already exists"
        // If so, we might want to recover it or ask user to delete it
        if (error.message?.includes("already exists")) {
            throw new Error("Instance already exists. Please contact support or try a different number.")
        }

        throw new Error("Failed to provision WhatsApp channel: " + error.message)
    }
}
