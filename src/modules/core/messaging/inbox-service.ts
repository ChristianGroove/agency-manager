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
        console.log(`[InboxService] Message saved automatically`)

        // 5. Trigger Automation
        try {
            const { automationTrigger } = await import("../automation/automation-trigger.service")
            // Fire and forget - don't block the webhook response
            automationTrigger.evaluateInput(
                msg.content,
                conversation.id,
                msg.channel,
                msg.from,
                conversation.lead_id // Using conversation's lead reference
            ).catch(err => console.error('[InboxService] Automation Trigger Error:', err))
        } catch (e) {
            console.error('[InboxService] Failed to load automation service:', e)
        }

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

        // 2. Resolve Connection ID (Multi-Tenancy / Multi-Account)
        let connectionId: string | null = null;

        // Try to find connection based on metadata
        const metadata = msg.metadata as any;
        if (metadata) {
            let query = supabase.from('integration_connections').select('id').eq('organization_id', orgId).eq('status', 'active');
            let matched = false;

            // Strategy A: Meta WhatsApp (phone_number_id)
            if (msg.channel === 'whatsapp' && metadata.phone_number_id) {
                // We need to filter JSONB credentials. Note: This requires non-encrypted storage or metadata index
                // For MVP with small table, we can fetch matching org connections and filter in code or use postgres json arrow
                // Using Postgres JSON arrow:
                // query = query.eq('credentials->>phoneNumberId', metadata.phone_number_id) // Syntax depends on driver support/types
                // Safer to fetch applicable connections and filter in memory since list is small per org

                const { data: connections } = await supabase
                    .from('integration_connections')
                    .select('id, credentials')
                    .eq('organization_id', orgId)
                    .eq('provider_key', 'meta_whatsapp')
                    .eq('status', 'active');

                if (connections) {
                    const found = connections.find((c: any) => c.credentials?.phoneNumberId === metadata.phone_number_id);
                    if (found) {
                        connectionId = found.id;
                        matched = true;
                        console.log(`[InboxService] Resolved Connection ID (Meta): ${connectionId}`);
                    }
                }
            }

            // Strategy B: Evolution API (instance)
            if (!matched && msg.channel === 'evolution' && metadata.instance) {
                const { data: connections } = await supabase
                    .from('integration_connections')
                    .select('id, credentials')
                    .eq('organization_id', orgId)
                    .eq('provider_key', 'evolution_api')
                    .eq('status', 'active');

                if (connections) {
                    const found = connections.find((c: any) => c.credentials?.instanceName === metadata.instance);
                    if (found) {
                        connectionId = found.id;
                        matched = true;
                        console.log(`[InboxService] Resolved Connection ID (Evolution): ${connectionId}`);
                    }
                }
            }
        }

        // 3. Find with Connection Filter
        let convQuery = supabase
            .from('conversations')
            .select('id, phone, state, status, connection_id')
            .eq('channel', msg.channel)
            .eq('lead_id', lead.id)
            .order('updated_at', { ascending: false });

        // CRITICAL: If we resolved a specific connection, filter by it.
        // If we didn't resolve (legacy/mock), look for one with NULL connection_id OR any (backward compat?)
        // Strict Mode: If connectionId is known, MUST match.
        if (connectionId) {
            convQuery = convQuery.eq('connection_id', connectionId);
        } else {
            // For legacy compatibility, if we have no idea which connection, we might pick the most recent one 
            // OR specifically look for null. Let's filter for NULL to avoid accidental merging with specific lines.
            // But for now, to be safe with existing data (which has null), we allow null matching.
            // Actually, if we want to separate "Legacy" from "New Multi-Account", we should prefer null here.
            // However, users might migrate. Let's just not filter by connection_id if null, risks merging, but safe for single-account.
        }

        const { data: existingConv } = await convQuery.limit(1).single();

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

            // Auto-heal connection_id if missing and we found one now
            if (!existingConv.connection_id && connectionId) {
                updates.connection_id = connectionId;
                console.log('[InboxService] Auto-healing conversation connection_id');
            }

            if (Object.keys(updates).length > 0) {
                await supabase.from('conversations').update(updates).eq('id', existingConv.id)
                console.log('[InboxService] Updated conversation:', updates)
            }

            return { data: existingConv, error: null }
        }

        // 4. Create new conversation
        console.log('[InboxService] Creating new conversation for lead:', lead.id, 'Connection:', connectionId)
        const { data: newConv, error: createError } = await supabase.from('conversations').insert({
            organization_id: orgId,
            lead_id: lead.id,
            channel: msg.channel,
            phone: msg.from,
            status: 'open',
            state: 'active',
            last_message: msg.content,
            last_message_at: new Date().toISOString(),
            unread_count: 1,
            connection_id: connectionId // New field
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
    async saveOutboundMessage(conversationId: string, content: any, externalId: string | null = null, sender: string = 'Agent', id?: string, channel: string = 'whatsapp') {
        const supabase = supabaseAdmin

        const { error } = await supabase.from('messages').insert({
            id: id, // Optional explicit ID
            conversation_id: conversationId,
            direction: 'outbound',
            channel: channel,
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
