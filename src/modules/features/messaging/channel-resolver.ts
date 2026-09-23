import { SupabaseClient } from "@supabase/supabase-js"
import { IncomingMessage } from "./providers/types"

export interface ConnectionMatch {
    connectionId: string
    organizationId: string
    connection: any
}

function chooseMetaConnection(direct: any | null, legacyMatches: any[]): ConnectionMatch | null {
    const candidates = [...(direct ? [direct] : []), ...legacyMatches]
    const unique = [...new Map(candidates.map(connection => [connection.id, connection])).values()]
    if (!unique.length) return null
    if (new Set(unique.map(connection => connection.organization_id)).size > 1) {
        throw new Error('Ambiguous Meta asset ownership across organizations')
    }
    // A modern channel supersedes its legacy parent within the same tenant.
    // Multiple legacy matches still require an explicit migration decision.
    if (!direct && unique.length > 1) throw new Error('Ambiguous legacy Meta asset ownership')
    const connection = direct || unique[0]
    return { connectionId: connection.id, organizationId: connection.organization_id, connection }
}

async function wasLocallyDisconnected(supabase: SupabaseClient, organizationId: string,
    providerKeys: string[], assetId: string): Promise<boolean> {
    const { data, error } = await supabase.from('integration_connections').select('id')
        .eq('organization_id', organizationId)
        .in('provider_key', providerKeys)
        .eq('status', 'deleted')
        .eq('metadata->>asset_id', assetId)
        .limit(1)
    if (error) throw new Error('Could not verify disconnected Meta asset')
    return Boolean(data?.length)
}

export class ChannelResolver {
    /**
     * Resolves an integration connection (tenant) based on incoming message metadata.
     * Strategy:
     * 1. Check for pre-resolved connectionId (from route handler)
     * 2. Direct asset_id matching for modern Meta channels
     * 3. Legacy asset matching for meta_business
     * 4. Instance matching for Evolution API
     */
    /**
     * Resolves an incoming webhook to a specific Channel Connection.
     * Uses metadata matching (phoneNumberId, pageId, instagramBusinessId).
     * 
     * @param msg The incoming message object containing channel and metadata.
     * @param supabase The Supabase client instance.
     * @returns A Promise that resolves to a ConnectionMatch object if a connection is found, otherwise null.
     */
    static async resolveConnection(msg: Pick<IncomingMessage, 'channel' | 'metadata'>, supabase: SupabaseClient): Promise<ConnectionMatch | null> {
        const metadata = msg.metadata as any
        const channel = msg.channel

        // 1. Pre-resolved from Route
        if (metadata?.connectionId) {
            const { data } = await supabase
                .from('integration_connections')
                .select('id, organization_id, provider_key, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline, welcome_message')
                .eq('id', metadata.connectionId)
                .in('status', ['active', 'connected'])
                .single()

            if (data) return { connectionId: data.id, organizationId: data.organization_id, connection: data }
        }

        // 2. WhatsApp Matching
        if (channel === 'whatsapp') {
            const phoneNumberId = metadata?.phoneNumberId || metadata?.phone_number_id
            if (!phoneNumberId) return null

            // Primary: Modern whatsapp_cloud
            const { data: direct, error: directError } = await supabase
                .from('integration_connections')
                .select('id, organization_id, provider_key, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline, welcome_message')
                .eq('provider_key', 'whatsapp_cloud')
                .in('status', ['active', 'connected'])
                .eq('metadata->>asset_id', phoneNumberId)
                .maybeSingle()

            if (directError) throw new Error("Could not uniquely resolve Meta channel")
            // Fallback: Legacy meta_business/meta_whatsapp
            const { data: legacy, error: legacyError } = await supabase
                .from('integration_connections')
                .select('id, organization_id, provider_key, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline, welcome_message')
                .in('provider_key', ['meta_business', 'meta_whatsapp'])
                .in('status', ['active', 'connected'])

            if (legacyError) throw new Error('Could not resolve legacy Meta channel')
            const matches = (legacy || []).filter((c: any) => {
                    const assetId = c.metadata?.asset_id
                    const selectedAssets = c.metadata?.selected_assets || []
                    return assetId === phoneNumberId || selectedAssets.some((a: any) =>
                        a.id === phoneNumberId && (!a.type || a.type === 'whatsapp'))
                })
            const match = chooseMetaConnection(direct, matches)
            if (!direct && match && await wasLocallyDisconnected(supabase, match.organizationId,
                ['whatsapp_cloud'], phoneNumberId)) return null
            return match
        }

        // 3. Messenger Matching
        if (channel === 'messenger') {
            const pageId = metadata?.pageId || metadata?.page_id
            if (!pageId) return null

            const { data: direct, error: directError } = await supabase
                .from('integration_connections')
                .select('id, organization_id, provider_key, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline, welcome_message')
                .eq('provider_key', 'facebook_page')
                .in('status', ['active', 'connected'])
                .eq('metadata->>asset_id', pageId)
                .maybeSingle()

            if (directError) throw new Error("Could not uniquely resolve Meta channel")
            // Legacy
            const { data: legacy, error: legacyError } = await supabase
                .from('integration_connections')
                .select('id, organization_id, provider_key, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline, welcome_message')
                .eq('provider_key', 'meta_business')
                .in('status', ['active', 'connected'])

            if (legacyError) throw new Error('Could not resolve legacy Meta channel')
            const matches = (legacy || []).filter((c: any) => {
                    const assetId = c.metadata?.asset_id
                    const selectedAssets = c.metadata?.selected_assets || []
                    return assetId === pageId || 
                           selectedAssets.some((a: any) => a.id === pageId && (!a.type || a.type === 'page'))
                })
            const match = chooseMetaConnection(direct, matches)
            if (!direct && match && await wasLocallyDisconnected(supabase, match.organizationId,
                ['facebook_page'], pageId)) return null
            return match
        }

        // 4. Instagram Matching
        if (channel === 'instagram') {
            const igId = metadata?.instagramBusinessId || metadata?.instagram_business_id
            if (!igId) return null

            const { data: directConnections } = await supabase
                .from('integration_connections')
                .select('id, organization_id, provider_key, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline, welcome_message')
                .in('provider_key', ['instagram_dm', 'instagram_dme'])
                .in('status', ['active', 'connected'])

            const candidates = Array.isArray(directConnections)
                ? directConnections.filter((c: any) => {
                    const metadata = c.metadata || {}
                    return metadata.asset_id === igId ||
                        metadata.page_id === igId ||
                        metadata.pageId === igId ||
                        metadata.instagram_business_id === igId ||
                        metadata.id === igId
                })
                : []
            if (candidates.length > 1) throw new Error("Ambiguous Meta asset ownership")
            const direct = candidates[0]

            // Legacy / Multi-asset (meta_business)
            const { data: legacy, error: legacyError } = await supabase
                .from('integration_connections')
                .select('id, organization_id, provider_key, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline, welcome_message')
                .eq('provider_key', 'meta_business')
                .in('status', ['active', 'connected'])

            if (legacyError) throw new Error('Could not resolve legacy Meta channel')
            const matches = (legacy || []).filter((c: any) => {
                    const selectedAssets = c.metadata?.selected_assets || []
                    const assetId = c.metadata?.asset_id || c.metadata?.page_id || c.metadata?.pageId
                    const connectionPageId = c.metadata?.page_id || c.metadata?.pageId
                    
                    return assetId === igId ||
                           connectionPageId === igId || // Match by Linked Page ID
                           selectedAssets.some((a: any) => a.id === igId && (!a.type || a.type === 'instagram')) ||
                           c.provider_key === 'instagram_dme' // Support for DME provider variants
                })
            const match = chooseMetaConnection(direct, matches)
            if (!direct && match && await wasLocallyDisconnected(supabase, match.organizationId,
                ['instagram_dm', 'instagram_dme'], igId)) return null
            return match
        }

        return null
    }
}
