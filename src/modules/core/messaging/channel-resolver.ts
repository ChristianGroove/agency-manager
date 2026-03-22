import { SupabaseClient } from "@supabase/supabase-js"
import { IncomingMessage } from "./providers/types"

export interface ConnectionMatch {
    connectionId: string
    organizationId: string
    connection: any
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
    static async resolveConnection(msg: IncomingMessage, supabase: SupabaseClient): Promise<ConnectionMatch | null> {
        const metadata = msg.metadata as any
        const channel = msg.channel

        // 1. Pre-resolved from Route
        if (metadata?.connectionId) {
            const { data } = await supabase
                .from('integration_connections')
                .select('id, organization_id, provider_key, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline, welcome_message')
                .eq('id', metadata.connectionId)
                .single()

            if (data) return { connectionId: data.id, organizationId: data.organization_id, connection: data }
        }

        // 2. WhatsApp Matching
        if (channel === 'whatsapp') {
            const phoneNumberId = metadata?.phoneNumberId || metadata?.phone_number_id
            if (!phoneNumberId) return null

            // Primary: Modern whatsapp_cloud
            const { data: direct } = await supabase
                .from('integration_connections')
                .select('id, organization_id, provider_key, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline, welcome_message')
                .eq('provider_key', 'whatsapp_cloud')
                .in('status', ['active', 'connected'])
                .eq('metadata->>asset_id', phoneNumberId)
                .maybeSingle()

            if (direct) return { connectionId: direct.id, organizationId: direct.organization_id, connection: direct }

            // Fallback: Legacy meta_business/meta_whatsapp
            const { data: legacy } = await supabase
                .from('integration_connections')
                .select('id, organization_id, provider_key, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline, welcome_message')
                .in('provider_key', ['meta_business', 'meta_whatsapp'])
                .in('status', ['active', 'connected'])

            if (legacy) {
                const matched = legacy.find((c: any) => {
                    const assetId = c.metadata?.asset_id
                    const selectedAssets = c.metadata?.selected_assets || []
                    return assetId === phoneNumberId || selectedAssets.some((a: any) => a.id === phoneNumberId)
                })
                if (matched) return { connectionId: matched.id, organizationId: matched.organization_id, connection: matched }
            }
        }

        // 3. Messenger Matching
        if (channel === 'messenger') {
            const pageId = metadata?.pageId || metadata?.page_id
            if (!pageId) return null

            const { data: direct } = await supabase
                .from('integration_connections')
                .select('id, organization_id, provider_key, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline, welcome_message')
                .eq('provider_key', 'facebook_page')
                .in('status', ['active', 'connected'])
                .eq('metadata->>asset_id', pageId)
                .maybeSingle()

            if (direct) return { connectionId: direct.id, organizationId: direct.organization_id, connection: direct }

            // Legacy
            const { data: legacy } = await supabase
                .from('integration_connections')
                .select('id, organization_id, provider_key, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline, welcome_message')
                .eq('provider_key', 'meta_business')
                .in('status', ['active', 'connected'])

            if (legacy) {
                const matched = legacy.find((c: any) => {
                    const assetId = c.metadata?.asset_id
                    const selectedAssets = c.metadata?.selected_assets || []
                    const assetsPreview = c.metadata?.assets_preview || []
                    return assetId === pageId || 
                           selectedAssets.some((a: any) => a.id === pageId) ||
                           assetsPreview.some((a: any) => a.id === pageId && a.type === 'page')
                })
                if (matched) return { connectionId: matched.id, organizationId: matched.organization_id, connection: matched }
            }
        }

        // 4. Instagram Matching
        if (channel === 'instagram') {
            const igId = metadata?.instagramBusinessId || metadata?.instagram_business_id
            if (!igId) return null

            const { data: direct } = await supabase
                .from('integration_connections')
                .select('id, organization_id, provider_key, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline, welcome_message')
                .eq('provider_key', 'instagram_dm')
                .in('status', ['active', 'connected'])
                .or(`metadata->>asset_id.eq.${igId},metadata->>page_id.eq.${igId},metadata->>pageId.eq.${igId}`)
                .maybeSingle()

            if (direct) return { connectionId: direct.id, organizationId: direct.organization_id, connection: direct }

            // Legacy / Multi-asset (meta_business)
            const { data: legacy } = await supabase
                .from('integration_connections')
                .select('id, organization_id, provider_key, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline, welcome_message')
                .eq('provider_key', 'meta_business')
                .in('status', ['active', 'connected'])

            if (legacy) {
                const matched = legacy.find((c: any) => {
                    const selectedAssets = c.metadata?.selected_assets || []
                    const assetsPreview = c.metadata?.assets_preview || []
                    const assetId = c.metadata?.asset_id || c.metadata?.page_id || c.metadata?.pageId
                    const connectionPageId = c.metadata?.page_id || c.metadata?.pageId
                    
                    return assetId === igId ||
                           connectionPageId === igId || // Match by Linked Page ID
                           selectedAssets.some((a: any) => a.id === igId) ||
                           assetsPreview.some((a: any) => a.id === igId && a.type === 'instagram') ||
                           c.provider_key === 'instagram_dme' // Support for DME provider variants
                })
                if (matched) return { connectionId: matched.id, organizationId: matched.organization_id, connection: matched }
            }
        }

        // 5. Evolution API Matching
        if (channel === 'evolution' && metadata?.instance) {
            const { data: connections } = await supabase
                .from('integration_connections')
                .select('id, organization_id, credentials, default_pipeline_stage_id, working_hours, auto_reply_when_offline, welcome_message')
                .eq('provider_key', 'evolution_api')
                .in('status', ['active', 'connected'])

            if (connections) {
                const matched = connections.find((c: any) => c.credentials?.instanceName === metadata.instance)
                if (matched) return { connectionId: matched.id, organizationId: matched.organization_id, connection: matched }
            }
        }

        return null
    }
}
