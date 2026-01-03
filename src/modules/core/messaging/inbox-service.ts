import { supabaseAdmin } from "@/lib/supabase-admin"
import { IncomingMessage } from "./providers/types"
import { ChannelType } from "@/types/messaging"
import { SupabaseClient } from "@supabase/supabase-js"

export class InboxService {

    /**
     * Process and save an incoming message to the database
     */
    async handleIncomingMessage(msg: IncomingMessage) {
        // Use Admin Client to bypass RLS for Webhook insertions using Service Role
        const supabase = supabaseAdmin

        console.log('[InboxService] Processing message from:', msg.from, 'channel:', msg.channel)

        // 1. Find or Create Conversation
        const { data: conversation, error: convError } = await this.upsertConversation(msg, supabase)

        if (convError || !conversation) {
            console.error("[InboxService] Failed to upsert conversation:", convError)
            return null
        }

        console.log(`[InboxService] Using conversation: ${conversation.id}`)

        // 2. Check for Duplicates (Idempotency)
        if (msg.externalId) {
            const { data: existingMsg } = await supabase
                .from('messages')
                .select('id')
                .eq('external_id', msg.externalId)
                .single()

            if (existingMsg) {
                console.log(`[InboxService] Skipping duplicate message: ${msg.externalId}`)
                return { success: true, conversationId: conversation.id }
            }
        }

        // 3. Insert Message
        const { error: msgError } = await supabase.from('messages').insert({
            conversation_id: conversation.id,
            direction: 'inbound',
            channel: msg.channel,
            content: msg.content,
            status: 'delivered',
            external_id: msg.externalId,
            sender: msg.from,
            metadata: msg,
            created_at: msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString()
        })

        if (msgError) {
            console.error("[InboxService] Failed to save message:", msgError)
            return null
        }

        // 4. Update triggers automatically via DB
        // The DB trigger 'update_conversation_last_message' handles unread_count increment and last_message update.
        console.log(`[InboxService] Message saved, triggers will update conversation ${conversation.id}`)

        return { success: true, conversationId: conversation.id }
    }

    /**
     * Find existing conversation by phone/channel or create new one
     * CRITICAL: Must filter by phone to avoid grouping messages from different senders
     */
    private async upsertConversation(msg: IncomingMessage, supabase: SupabaseClient) {
        // 1. Get Default Organization
        const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
        const orgId = org?.id

        if (!orgId) {
            console.error("[InboxService] FATAL: No Organization found")
            return { data: null, error: new Error("No Organization found") }
        }

        console.log('[InboxService] Organization ID:', orgId)

        // 2. Find or create Lead by phone
        let lead = null
        const { data: existingLead } = await supabase
            .from('leads')
            .select('id, phone, name')
            .eq('phone', msg.from)
            .eq('organization_id', orgId)
            .single()

        if (existingLead) {
            lead = existingLead
            console.log('[InboxService] Found existing lead:', lead.id)
        } else {
            console.log('[InboxService] Creating new lead for:', msg.from)
            const { data: newLead, error: leadError } = await supabase.from('leads').insert({
                organization_id: orgId,
                phone: msg.from,
                name: msg.senderName || msg.from,
                status: 'new'
            }).select().single()

            if (leadError) {
                console.error('[InboxService] Failed to create lead:', leadError)
                return { data: null, error: leadError }
            }

            lead = newLead
            console.log('[InboxService] Created new lead:', lead.id)
        }

        // 3. Find existing conversation for THIS specific lead/phone + channel
        // CRITICAL: Always filter by lead_id to prevent grouping different senders
        const { data: existingConv } = await supabase
            .from('conversations')
            .select('id, phone, state, status')
            .eq('channel', msg.channel)
            .eq('lead_id', lead.id) // CRITICAL: Filter by lead to isolate conversations
            .order('updated_at', { ascending: false })
            .limit(1)
            .single()

        if (existingConv) {
            console.log('[InboxService] Found existing conversation:', existingConv.id)

            // Reopen if archived and ensure phone is set
            const updates: any = {}
            if (existingConv.state === 'archived') {
                updates.state = 'active'
                updates.status = 'open'
            }
            if (!existingConv.phone) {
                updates.phone = msg.from
            }

            if (Object.keys(updates).length > 0) {
                await supabase.from('conversations').update(updates).eq('id', existingConv.id)
                console.log('[InboxService] Updated conversation:', updates)
            }

            return { data: existingConv, error: null }
        }

        // 4. Create new conversation
        console.log('[InboxService] Creating new conversation for lead:', lead.id)
        const { data: newConv, error: createError } = await supabase.from('conversations').insert({
            organization_id: orgId,
            lead_id: lead.id,
            channel: msg.channel,
            phone: msg.from,
            status: 'open',
            state: 'active',
            last_message: msg.content,
            last_message_at: new Date().toISOString(),
            unread_count: 1
        }).select().single()

        if (createError) {
            console.error('[InboxService] Failed to create conversation:', createError)
            return { data: null, error: createError }
        }

        console.log('[InboxService] Created new conversation:', newConv.id)
        return { data: newConv, error: null }
    }

    /**
     * Save an outbound message sent by an agent
     */
    async saveOutboundMessage(conversationId: string, content: any, externalId: string | null = null, sender: string = 'Agent', id?: string) {
        const supabase = supabaseAdmin

        const { error } = await supabase.from('messages').insert({
            id: id, // Optional explicit ID
            conversation_id: conversationId,
            direction: 'outbound',
            channel: 'whatsapp',
            content: content,
            status: 'sent',
            external_id: externalId,
            sender: sender
        })

        if (error) {
            console.error('[InboxService] Failed to save outbound message:', error)
            throw error
        }

        // Update triggers automatically via DB
        // The DB trigger 'update_conversation_last_message' updates last_message, 
        // but does NOT increment unread_count for outbound (checked trigger definition).
        console.log(`[InboxService] Outbound message saved, trigger will update convo ${conversationId}`)
    }
}

// Export singleton instance
export const inboxService = new InboxService()
