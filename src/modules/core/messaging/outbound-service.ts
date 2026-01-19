import { supabaseAdmin } from "@/lib/supabase-admin"
import { integrationRegistry } from "@/modules/core/integrations/registry"
import { inboxService } from "./inbox-service"

export class OutboundService {
    async sendMessage(
        channelId: string,
        recipientPhone: string,
        content: string | any,
        organizationId: string
    ) {
        // 1. Get Channel Credentials
        const supabase = supabaseAdmin
        const { data: channel } = await supabase
            .from('integration_connections')
            .select('*')
            .eq('id', channelId)
            // .eq('organization_id', organizationId) // Optional security check
            .single()

        if (!channel) throw new Error(`Channel ${channelId} not found`)

        // 2. Get Adapter
        const adapter = integrationRegistry.getAdapter(channel.provider_key)
        if (!adapter || !adapter.sendMessage) {
            throw new Error(`Provider ${channel.provider_key} does not support sending messages`)
        }

        console.log(`[OutboundService] Sending via ${channel.provider_key} to ${recipientPhone}`)

        // 3. Find Conversation Context (Moved before sending to get metadata)
        const { data: conv } = await supabase
            .from('conversations')
            .select('id, channel, metadata')
            .eq('organization_id', organizationId)
            .eq('phone', recipientPhone)
            .neq('state', 'archived')
            .order('updated_at', { ascending: false })
            .limit(1)
            .single()

        let metadata: any = {};

        if (conv) {
            const meta = conv.metadata || {};

            if (conv.channel === 'whatsapp' && meta.phoneNumberId) {
                metadata.phoneNumberId = meta.phoneNumberId;
            } else if (conv.channel === 'messenger' && meta.pageId) {
                metadata.pageId = meta.pageId;
            } else if (conv.channel === 'instagram') {
                // Fallback to pageId or instagramBusinessId
                metadata.pageId = meta.instagramBusinessId || meta.pageId;
            }
        }

        // Fallback: If no active conversation, try to check archived
        let conversationId = conv?.id;

        if (!conversationId) {
            const { data: archived } = await supabase
                .from('conversations')
                .select('id, channel, metadata')
                .eq('organization_id', organizationId)
                .eq('phone', recipientPhone)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single()

            if (archived) {
                conversationId = archived.id;
                const meta = archived.metadata || {};
                if (archived.channel === 'whatsapp' && meta.phoneNumberId) {
                    metadata.phoneNumberId = meta.phoneNumberId;
                } else if (archived.channel === 'messenger' && meta.pageId) {
                    metadata.pageId = meta.pageId;
                }
            }
        }

        console.log(`[OutboundService] Resolved Metadata for Send:`, metadata);

        // 4. Send via Adapter
        const result = await adapter.sendMessage(channel.credentials, recipientPhone, content, metadata)

        // 5. Log to DB
        if (conversationId) {
            await inboxService.saveOutboundMessage(
                conversationId,
                content,
                result.messageId,
                'System'
            )
        } else {
            console.warn(`[OutboundService] No conversation found for ${recipientPhone}, message sent but not logged.`)
        }

        return result
    }
}

export const outboundService = new OutboundService()
