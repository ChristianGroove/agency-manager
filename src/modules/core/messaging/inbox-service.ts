import { supabaseAdmin } from "@/lib/supabase-admin"
import type { IncomingMessage } from "@/modules/core/messaging/providers/types"
import { ChannelType } from "@/types/messaging"
import { SupabaseClient } from "@supabase/supabase-js"
import { normalizePhone } from "@/lib/normalize-phone"
import { ChannelResolver, ConnectionMatch } from "@/modules/core/messaging/channel-resolver"
import { BusinessHoursEngine } from "@/lib/business-hours"

export class InboxService {

    /**
     * Process and save an incoming message to the database
     */
    async handleIncomingMessage(msg: IncomingMessage, supabase: SupabaseClient = supabaseAdmin) {
        console.log('[InboxService] 📥 handleIncomingMessage from:', msg.from, 'Channel:', msg.channel)

        // 1. Idempotency Check (Primary)
        if (msg.externalId) {
            const { data: existingMsg } = await supabase
                .from('messages')
                .select('id, conversation_id, conversations(lead_id)')
                .eq('external_id', msg.externalId)
                .maybeSingle()

            if (existingMsg) {
                console.log(`[InboxService] Duplicate message detected: ${msg.externalId}. Evaluating automation triggers.`)
                const convId = existingMsg.conversation_id;
                const leadId = (existingMsg.conversations as any)?.lead_id;

                if (convId && leadId) {
                    // Duplicate detected: Do NOT trigger automation again.
                    // It's already running or completed for this message ID.
                    return { success: true, conversationId: convId }
                }
            }
        }

        // 2. Resolve Context (Tenant, Lead, Conversation)
        const match = await ChannelResolver.resolveConnection(msg, supabase)
        if (!match) {
            console.log('[InboxService] ❌ REJECTED: No matching integration connection found for:', msg.from, 'Metadata:', JSON.stringify(msg.metadata))
            return { success: false, error: 'Tenant isolation: No matching connection' }
        }
        console.log('[InboxService] ✅ Match found:', match.connectionId, 'Org:', match.organizationId)

        const { conversation, lead, isNewLead } = await this.resolveMetadataContext(msg, match, supabase)
        if (!conversation) return null

        // 3. ATOMIC MESSAGE INSERTION (Single point of truth)
        const isEcho = msg.origin === 'outbound'
        const direction = isEcho ? 'outbound' : 'inbound'
        const status = isEcho ? 'sent' : 'received'
        
        // If it's an echo, we check if the conversation is assigned to a human.
        // If assigned, we treat the echo as 'human' to prevent bot icon re-activation.
        const effectiveSenderType = isEcho 
            ? (conversation.assigned_to ? 'human' : 'bot') 
            : 'human'
            
        const sender = isEcho ? (effectiveSenderType === 'bot' ? 'System' : 'Agent') : (msg.senderName || msg.from)

        const { data: insertedMsg, error: msgError } = await supabase.from('messages').insert({
            conversation_id: conversation.id,
            organization_id: match.organizationId,
            direction: direction,
            channel: msg.channel,
            content: msg.content,
            status: status,
            external_id: msg.externalId,
            sender: sender,
            metadata: {
                ...msg,
                buttonId: msg.buttonId,
                sender_type: effectiveSenderType,
                is_echo: isEcho,
                timestamp: msg.timestamp?.toISOString()
            },
            created_at: msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString()
        }).select('id').single()

        if (msgError) {
            // Handle unique constraint violation (idempotency at DB level)
            if (msgError.code === '23505') {
                console.log(`[InboxService] Atomic duplicate detected for ${msg.externalId}. Skipping insert.`)
                return { success: true, conversationId: conversation.id }
            }
            console.error('[InboxService] Failed to save message:', msgError)
            return null
        }


        // 4. Trigger Automations (Welcome, Pipeline, AI)
        // Background triggers to avoid webhook timeouts
        if (!isEcho) {
            // New Lead/Conversation Automation (Welcome, Stage, Offline)
            await this.handleConnectionAutomation(
                supabase,
                match,
                lead,
                !isNewLead,
                conversation.id,
                msg.from
            )
            
            // Workflow Automation Triggers
            // Meta 2026: Triggers generally fire AFTER welcome/offline if applicable
            await this.triggerAutomation(msg, conversation.id, lead.id, match.connectionId)
        }

        return { success: true, conversationId: conversation.id }
    }

    private async triggerAutomation(msg: IncomingMessage, conversationId: string, leadId: string, connectionId?: string) {
        console.log('[InboxService] 🤖 triggerAutomation called for conv:', conversationId)
        try {
            const { automationTrigger } = await import("../automation/automation-trigger.service")
            console.log('[InboxService] 🤖 Calling evaluateInput...')
            await automationTrigger.evaluateInput(
                typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
                conversationId,
                msg.channel,
                msg.from,
                leadId,
                connectionId,
                msg.id || msg.externalId || undefined
            ).catch(err => console.error('[InboxService] Automation Trigger Error:', err))
            console.log('[InboxService] 🤖 evaluateInput completed.')
        } catch (e) {
            console.warn('[InboxService] Failed to load automation service:', e)
        }
    }

    private async resolveMetadataContext(msg: IncomingMessage, match: ConnectionMatch, supabase: SupabaseClient) {
        const { organizationId, connectionId } = match
        const normalizedPhone = normalizePhone(msg.from)
        
        console.log(`[InboxService] Resolving context for Org: ${organizationId}, Phone: ${normalizedPhone}`);

        // 1. Resolve Lead
        let lead = null
        let isNewLead = false

        const { data: foundLeads, error: leadFindError } = await supabase
            .from('leads')
            .select('id, phone, name')
            .eq('phone', normalizedPhone)
            .eq('organization_id', organizationId)
            .limit(1)

        if (foundLeads && foundLeads.length > 0) {
            lead = foundLeads[0]
            console.log(`[InboxService] Existing lead found: ${lead.id}`);
            // ... (rest of update logic)
        } else {
            console.log(`[InboxService] Lead not found. Creating new lead...`);
            const { data: newLead, error: leadInsertError } = await supabase.from('leads').insert({
                organization_id: organizationId,
                phone: normalizedPhone,
                name: msg.senderName || normalizedPhone,
                avatar_url: msg.senderAvatarUrl,
                status: 'new',
                source_connection_id: connectionId
            }).select().single()

            if (leadInsertError) {
                console.error(`[InboxService] Error creating lead:`, leadInsertError);
            }
            lead = newLead
            isNewLead = true
        }

        if (!lead) {
            console.error(`[InboxService] CRITICAL: Lead resolution failed (lead is null)`);
            return { conversation: null, lead: null, isNewLead: false }
        }

        // 2. Resolve Conversation
        let convQuery = supabase
            .from('conversations')
            .select('*')
            .eq('channel', msg.channel)
            .eq('lead_id', lead.id)
            .eq('organization_id', organizationId)
            .order('updated_at', { ascending: false })

        if (connectionId) convQuery = convQuery.eq('connection_id', connectionId)
        else convQuery = convQuery.is('connection_id', null)

        const { data: existingConvs } = await convQuery.limit(1)
        let conversation = existingConvs && existingConvs.length > 0 ? existingConvs[0] : null

        if (conversation) {
            // Update Existing Conversation (Metadata & State)
            const updates: any = {}
            if (conversation.state !== 'active' && msg.origin !== 'outbound') {
                updates.state = 'active'
                updates.status = 'open'
            }
            
            // Sync Preview & Metadata
            updates.last_message = typeof msg.content === 'object' ? msg.content : { type: 'text', text: msg.content }
            updates.last_message_preview = typeof msg.content === 'object' ? (msg.content as any).text : msg.content
            updates.last_message_at = new Date().toISOString()

            const metadataChange = { ...((conversation as any).metadata || {}), ...msg.metadata }
            if (msg.referral) {
                metadataChange.referral = {
                    ...msg.referral,
                    free_tier_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
                }
            }
            updates.metadata = metadataChange

            if (Object.keys(updates).length > 0) {
                await supabase.from('conversations').update(updates).eq('id', conversation.id)
            }
        } else {
            // Create New Conversation
            const { data: leadTags } = await supabase
                .from('crm_lead_tags')
                .select('tag:crm_tags(name)')
                .eq('lead_id', lead.id)

            const initialTags = leadTags ? leadTags.map((t: any) => t.tag.name) : []

            const { data: newConv } = await supabase.from('conversations').insert({
                organization_id: organizationId,
                lead_id: lead.id,
                channel: msg.channel,
                phone: normalizedPhone,
                status: 'open',
                state: 'active',
                is_bot_active: true, // Meta 2026: Bot handles new chats by default
                last_message: typeof msg.content === 'object' ? msg.content : { type: 'text', text: msg.content },
                last_message_preview: typeof msg.content === 'object' ? (msg.content as any).text : msg.content,
                last_message_at: new Date().toISOString(),
                connection_id: connectionId,
                metadata: msg.metadata,
                tags: initialTags
            }).select().single()
            conversation = newConv
        }

        return { conversation, lead, isNewLead }
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
            content: typeof content === 'string' ? { type: 'text', text: content } : content,
            status: 'sent',
            external_id: externalId,
            sender: sender,
            metadata: {
                sender_type: sender === 'System' ? 'bot' : 'human'
            }
        })

        if (error) {
            console.error('[InboxService] Failed to save outbound message:', error)
            throw error
        }

        // Update triggers automatically via DB
        // The DB trigger 'update_conversation_last_message' updates last_message, 
        // but does NOT increment unread_count for outbound (checked trigger definition).
        console.log(`[InboxService] Outbound message saved, trigger will update convo ${conversationId} `)
    }

    /**
     * Handle automation logic (Pipeline, Working Hours, Auto-Reply, Welcome Message)
     */
    private async handleConnectionAutomation(
        supabase: SupabaseClient,
        match: ConnectionMatch,
        lead: any,
        existingLead: boolean,
        conversationId: string | null,
        recipientPhone: string
    ) {
        const { connection, organizationId: orgId } = match
        const { outboundService } = await import("./outbound-service")
        
        // 1. Pipeline Auto-Assignment (New Leads Only)
        if (!existingLead && connection.default_pipeline_stage_id) {
            await supabase.from('leads').update({
                current_pipeline_stage_id: connection.default_pipeline_stage_id
            }).eq('id', lead.id)
        }

        // 2. Working Hours & Auto-Reply (Offline Message) with RATE LIMITING
        const timezone = connection.working_hours?.timezone || 'America/Bogota'
        const isOnline = this.isWithinWorkingHours(connection.working_hours, timezone)
        
        console.log(`[InboxService] Business Hours Status: ${isOnline ? 'ONLINE' : 'OFFLINE'} | Timezone: ${timezone}`);

        if (!isOnline && connection.auto_reply_when_offline) {
            let shouldSend = true

            if (conversationId) {
                const { data: conv } = await supabase
                    .from('conversations')
                    .select('last_auto_reply_at')
                    .eq('id', conversationId)
                    .single()

                if (conv?.last_auto_reply_at) {
                    const lastReply = new Date(conv.last_auto_reply_at)
                    const hourAgo = new Date(Date.now() - 60 * 60 * 1000) // 1 hour rate limit
                    if (lastReply > hourAgo) {
                        shouldSend = false
                    }
                }
            }

            if (shouldSend) {
                try {
                    await outboundService.sendMessage(
                        connection.id,
                        recipientPhone,
                        connection.auto_reply_when_offline,
                        orgId,
                        { connection }
                    );
                    
                    if (conversationId) {
                        await supabase
                            .from('conversations')
                            .update({ last_auto_reply_at: new Date().toISOString() })
                            .eq('id', conversationId)
                    }
                    console.log(`[InboxService] Auto-reply SENT successfully.`);
                } catch (error: any) {
                    console.error("[InboxService] ERROR sending auto-reply:", error.message);
                }
            }
            return;
        } else if (!isOnline) {
            console.log(`[InboxService] Channel is OFFLINE but no auto-reply message is configured.`);
        }

        // 3. Welcome Message (New Leads Only) - ONLY if Online
        if (!existingLead && connection.welcome_message && isOnline) {
            try {
                console.log(`[InboxService] Sending welcome message to new lead ${lead.id}`)
                await outboundService.sendMessage(
                    connection.id,
                    recipientPhone,
                    connection.welcome_message,
                    orgId,
                    { connection }
                )
            } catch (error: any) {
                console.error("[InboxService] Failed to send welcome message:", error.message)
            }
        }
    }

    /**
     * Check if a conversation has an active 24h session window (Meta policies)
     * A window is active if the last INBOUND message was received less than 24h ago.
     */
    async hasActiveSessionWindow(conversationId: string): Promise<boolean> {
        const { data: lastInbound, error } = await supabaseAdmin
            .from('messages')
            .select('created_at')
            .eq('conversation_id', conversationId)
            .eq('direction', 'inbound')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !lastInbound) return false;

        const lastMessageDate = new Date(lastInbound.created_at);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        return lastMessageDate > twentyFourHoursAgo;
    }

    private isWithinWorkingHours(config: any, timezone: string = 'America/Bogota'): boolean {
        return BusinessHoursEngine.isOnline(config, new Date());
    }

    /**
     * Helper to update lead status based on pipeline stage ID
     */
    private async assignPipelineStage(supabase: SupabaseClient, leadId: string, stageId: string) {
        try {
            // Get status key from stage
            const { data: stage } = await supabase
                .from('pipeline_stages')
                .select('status_key')
                .eq('id', stageId)
                .single();

            if (stage && stage.status_key) {
                await supabase
                    .from('leads')
                    .update({ status: stage.status_key })
                    .eq('id', leadId);
                console.log(`[InboxService] Auto - assigned lead ${leadId} to stage ${stage.status_key} `);
            }
        } catch (error) {
            console.error('[InboxService] Failed to auto-assign pipeline stage:', error);
        }
    }
}

// Export singleton instance
export const inboxService = new InboxService()
