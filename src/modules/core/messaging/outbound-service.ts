import { supabaseAdmin } from "@/lib/supabase-admin"
import { integrationRegistry } from "@/modules/core/integrations/registry"
import { inboxService } from "./inbox-service"
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
        let metadata: any = {}
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

        if (conv) {
            const meta = conv.metadata || {}
            if (conv.channel === 'whatsapp' && meta.phoneNumberId) {
                metadata.phoneNumberId = meta.phoneNumberId
            } else if (conv.channel === 'messenger' && meta.pageId) {
                metadata.pageId = meta.pageId
            } else if (conv.channel === 'instagram') {
                metadata.pageId = meta.instagramBusinessId || meta.pageId
            }
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
