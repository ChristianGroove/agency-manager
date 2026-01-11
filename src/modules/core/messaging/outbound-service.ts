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

        // 3. Send via Adapter
        // Note: recipientPhone might need formatting depending on provider, but usually raw e.164 is fine
        const result = await adapter.sendMessage(channel.credentials, recipientPhone, content)

        // 4. Find Conversation to log to
        // We look for any open/active conversation with this phone number within the organization
        // We prioritize matching connection_id, but fallback to any for this phone to ensure logging
        // (Since we already sent the message, we MUST log it somewhere)
        const { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('organization_id', organizationId) // Ensure org isolation
            .eq('phone', recipientPhone)
            .neq('state', 'archived') // Prefer active ones
            .order('updated_at', { ascending: false })
            .limit(1)
            .single()

        let targetConvId = conv?.id

        if (!targetConvId) {
            // Try archived if no active found
            const { data: archivedConv } = await supabase
                .from('conversations')
                .select('id')
                .eq('organization_id', organizationId)
                .eq('phone', recipientPhone)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single()

            targetConvId = archivedConv?.id
        }

        const conversationId = targetConvId

        if (conversationId) {
            // 5. Save to DB using InboxService helper (or do it here)
            // InboxService.saveOutboundMessage saves as "sent" from "Agent"
            await inboxService.saveOutboundMessage(
                conversationId,
                content,
                result.messageId,
                'System' // Or 'Auto-Reply'
            )
        } else {
            console.warn(`[OutboundService] No conversation found for ${recipientPhone}, message sent but not logged to a conversation.`)
        }

        return result
    }
}

export const outboundService = new OutboundService()
