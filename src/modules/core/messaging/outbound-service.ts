import { supabaseAdmin } from "@/lib/supabase-admin"
import { integrationRegistry } from "@/modules/core/integrations/registry"
import { normalizePhone } from "@/lib/normalize-phone"

export class OutboundService {
    async sendMessage(
        channelId: string,
        recipientPhone: string,
        content: string | any,
        organizationId: string,
        context?: { connection?: any, conversation?: any }
    ) {
        const supabase = supabaseAdmin
        
        // 1. Get Channel Connection (Check context first)
        let channel = context?.connection
        if (!channel) {
            const { data: fetchedChannel } = await supabase
                .from('integration_connections')
                .select('*')
                .eq('id', channelId)
                .single()
            channel = fetchedChannel
        }

        if (!channel) throw new Error(`Channel ${channelId} not found`)

        // 2. Get Adapter
        const adapter = integrationRegistry.getAdapter(channel.provider_key)
        if (!adapter || !adapter.sendMessage) {
            throw new Error(`Provider ${channel.provider_key} does not support sending messages`)
        }

        console.log(`[OutboundService] Sending via ${channel.provider_key} to ${recipientPhone}`)

        // 3. Resolve Metadata for Send
        const normalizedRecipient = normalizePhone(recipientPhone)
        let metadata: any = { channel: channel.provider_key === 'whatsapp_cloud' ? 'whatsapp' : (channel.provider_key === 'facebook_page' ? 'messenger' : 'instagram') }
        let conversationId: string | null = context?.conversation?.id || null

        // Use context conversation if available, otherwise fetch
        let conv = context?.conversation
        if (!conv) {
             const { data: fetchedConv } = await supabase
                .from('conversations')
                .select('id, channel, metadata')
                .eq('organization_id', organizationId)
                .eq('phone', normalizedRecipient)
                .neq('state', 'archived')
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle()
             conv = fetchedConv
             conversationId = conv?.id || null
        }

        // 4. Extract IDs from Conversation or Connection Metadata
        const convMeta = conv?.metadata || {}
        const connMeta = channel.metadata || {}
        const currentChannel = conv?.channel || metadata.channel

        if (currentChannel === 'whatsapp') {
            metadata.phoneNumberId = convMeta.phoneNumberId || connMeta.asset_id || connMeta.phone_number_id
            metadata.channel = 'whatsapp'
        } else if (currentChannel === 'messenger' || channel.provider_key === 'facebook_page') {
            metadata.pageId = convMeta.pageId || connMeta.asset_id || connMeta.page_id
            metadata.channel = 'messenger'
        } else if (currentChannel === 'instagram' || ['instagram_dm', 'instagram_dme'].includes(channel.provider_key)) {
            metadata.pageId = convMeta.instagramBusinessId || convMeta.pageId || connMeta.asset_id || connMeta.instagram_business_id
            metadata.channel = 'instagram'
        }

        // Fallback for archived if still no conversationId
        if (!conversationId) {
            const { data: archived } = await supabase
                .from('conversations')
                .select('id, channel, metadata')
                .eq('organization_id', organizationId)
                .eq('phone', normalizedRecipient)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (archived) {
                conversationId = archived.id
                const meta = archived.metadata || {}
                if (archived.channel === 'whatsapp' && meta.phoneNumberId) {
                    metadata.phoneNumberId = meta.phoneNumberId
                } else if (archived.channel === 'messenger' && meta.pageId) {
                    metadata.pageId = meta.pageId
                }
            }
        }

        // 4. Send via Adapter
        const result = await adapter.sendMessage(channel.credentials, recipientPhone, content, metadata)

        // 5. Log to DB
        if (conversationId) {
            const { inboxService: inbox } = await import("./inbox-service")
            await inbox.saveOutboundMessage(
                conversationId,
                content,
                result.messageId,
                'System'
            )
        } else {
            console.warn(`[OutboundService] No conversation found for ${recipientPhone}, message sent but not logged.`)
        }

        // 6. Return Result
        return result;
    }

    /**
     * Send a message from a background system process (Automation Engine)
     * using Admin privileges to bypass RLS.
     */
    async sendSystemMessage(
        conversationId: string,
        content: any,
        channel: string = 'whatsapp',
        connectionId?: string,
        sender: string = 'System'
    ) {
        const supabase = supabaseAdmin;
        
        try {
            // 1. Get Conversation securely via Admin
            const { data: conversation, error: convError } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', conversationId)
                .single();

            if (convError || !conversation) {
                console.error(`[OutboundService.sendSystemMessage] Conversation not found: ${conversationId}`);
                throw new Error("Conversation not found");
            }

            // 2. Identify Recipient Phone deterministically 
            // Priority: literal DB column 'phone', fallback to metadata
            const recipientPhone = conversation.phone || conversation.metadata?.phone || conversation.metadata?.external_id;

            if (!recipientPhone) {
                console.error(`[OutboundService.sendSystemMessage] Missing recipient for conversation: ${conversationId}`);
                throw new Error("Recipient phone/id is missing in conversation");
            }

            const resolveConnectionId = connectionId || conversation.connection_id;

            if (!resolveConnectionId) {
                 throw new Error("Connection ID could not be resolved");
            }

            // 3. Delegate to robust sendMessage
            const result = await this.sendMessage(
                resolveConnectionId,
                recipientPhone,
                content,
                conversation.organization_id,
                { conversation } // Pass conversation context to avoid refetching
            ) as any;

            return {
                success: true,
                externalId: result.messageId,
                error: null
            };
        } catch (error: any) {
             console.error("[sendSystemMessage] Error:", error);
             return { success: false, error: error.message };
        }
    }
}

export const outboundService = new OutboundService()
