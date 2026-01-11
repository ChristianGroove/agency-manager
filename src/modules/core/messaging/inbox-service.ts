import { supabaseAdmin } from "@/lib/supabase-admin"
import { fileLogger } from "@/lib/file-logger"
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

        fileLogger.log('[InboxService] Processing message from:', msg.from)

        // 1. Find or Create Conversation
        const { data: conversation, error: convError, connectionId } = await this.upsertConversation(msg, supabase)

        if (convError || !conversation) {
            fileLogger.log('[InboxService] FAILED to upsert conversation:', convError)
            return null
        }

        fileLogger.log(`[InboxService] Using conversation: ${conversation.id}`)

        // 2. Check for Duplicates (Idempotency)
        if (msg.externalId) {
            const { data: existingMsg } = await supabase
                .from('messages')
                .select('id')
                .eq('external_id', msg.externalId)
                .single()

            if (existingMsg) {
                fileLogger.log(`[InboxService] Skipping DUPLICATE message: ${msg.externalId}`)
                // CRITICAL FIX: Trigger automation even for duplicates (message was already inserted by upsertConversation)
                try {
                    const { automationTrigger } = await import("../automation/automation-trigger.service")
                    automationTrigger.evaluateInput(
                        typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
                        conversation.id,
                        msg.channel,
                        msg.from,
                        conversation.lead_id,
                        connectionId || conversation.connection_id
                    ).catch(err => fileLogger.log('[InboxService] Automation Trigger Error on duplicate:', err))
                } catch (e) {
                    fileLogger.log('[InboxService] Failed to load automation service on duplicate:', e)
                }
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
            fileLogger.log('[InboxService] Failed to save message:', msgError)
            return null
        }

        // 4. Update triggers automatically via DB
        // The DB trigger 'update_conversation_last_message' handles unread_count increment and last_message update.
        fileLogger.log(`[InboxService] Message saved. About to trigger automation...`)

        // 5. Trigger Automation
        try {
            const { automationTrigger } = await import("../automation/automation-trigger.service")
            // Fire and forget - don't block the webhook response
            automationTrigger.evaluateInput(
                typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
                conversation.id,
                msg.channel,
                msg.from,
                conversation.lead_id, // Using conversation's lead reference
                connectionId || conversation.connection_id // Include resolved connection ID
            ).catch(err => fileLogger.log('[InboxService] Automation Trigger Error:', err))
        } catch (e) {
            fileLogger.log('[InboxService] Failed to load automation service:', e)
        }

        return { success: true, conversationId: conversation.id }
    }

    /**
     * Find existing conversation by phone/channel or create new one
     * CRITICAL: Tenant isolation - Organization is derived from matching integration connection
     */
    private async upsertConversation(msg: IncomingMessage, supabase: SupabaseClient) {
        // 1. RESOLVE CONNECTION FIRST (This determines the tenant)
        let connectionId: string | null = null;
        let orgId: string | null = null;
        let matchedConnection: any = null;

        const metadata = msg.metadata as any;
        fileLogger.log('[InboxService] Resolving connection from metadata:', { phoneNumberId: metadata?.phoneNumberId, channel: msg.channel });

        // Strategy A: Meta WhatsApp (phone_number_id)
        if (msg.channel === 'whatsapp') {
            const { data: connections } = await supabase
                .from('integration_connections')
                .select('id, organization_id, credentials, default_pipeline_stage_id, working_hours, auto_reply_when_offline')
                .in('provider_key', ['meta_whatsapp', 'whatsapp']) // Support both legacy and new
                .eq('status', 'active');

            if (connections) {
                const { decryptObject } = await import('@/modules/core/integrations/encryption');

                const found: any = connections.find((c: any) => {
                    let creds = c.credentials || {};
                    if (typeof creds === 'string') {
                        try { creds = JSON.parse(creds); } catch (e) { }
                    }
                    creds = decryptObject(creds);
                    const storedId = creds.phoneNumberId || creds.phone_number_id;
                    return storedId === metadata?.phoneNumberId || storedId === metadata?.phone_number_id;
                });

                if (found) {
                    connectionId = found.id;
                    orgId = found.organization_id; // CRITICAL: Use connection's org
                    matchedConnection = found;
                    fileLogger.log('[InboxService] Matched Meta WhatsApp connection:', { connectionId, orgId });
                }
            }
        }

        // Strategy B: Evolution API (instance)
        if (!connectionId && msg.channel === 'evolution' && metadata?.instance) {
            const { data: connections } = await supabase
                .from('integration_connections')
                .select('id, organization_id, credentials, default_pipeline_stage_id, working_hours, auto_reply_when_offline')
                .eq('provider_key', 'evolution_api')
                .eq('status', 'active');

            if (connections) {
                const found: any = connections.find((c: any) => c.credentials?.instanceName === metadata.instance);
                if (found) {
                    connectionId = found.id;
                    orgId = found.organization_id; // CRITICAL: Use connection's org
                    matchedConnection = found;
                    fileLogger.log('[InboxService] Matched Evolution API connection:', { connectionId, orgId });
                }
            }
        }

        // STRICT TENANT ISOLATION: If no connection matched, REJECT the message
        if (!orgId || !connectionId) {
            fileLogger.log('[InboxService] REJECTED: No matching integration connection for this webhook');
            return { data: null, error: new Error('No matching integration connection found. Message rejected for tenant isolation.'), success: false };
        }

        // 2. Find or create Lead by phone (now using correct org)
        let lead = null;
        let existingLead = null;
        const { data: foundLead } = await supabase
            .from('leads')
            .select('id, phone, name')
            .eq('phone', msg.from)
            .eq('organization_id', orgId)
            .single();

        if (foundLead) {
            lead = foundLead;
            existingLead = foundLead;
            fileLogger.log('[InboxService] Found existing lead:', lead.id);
        } else {
            fileLogger.log('[InboxService] Creating new lead for:', msg.from);
            const { data: newLead, error: leadError } = await supabase.from('leads').insert({
                organization_id: orgId,
                phone: msg.from,
                name: msg.senderName || msg.from,
                status: 'new',
                source_connection_id: connectionId // Attribution: Track which line captured this lead
            }).select().single();

            if (leadError) {
                fileLogger.log('[InboxService] Failed to create lead:', leadError);
                return { data: null, error: leadError, success: false };
            }

            lead = newLead;
            fileLogger.log('[InboxService] Created new lead:', lead.id);
        }

        // Connection automation is called AFTER conversation is found/created for rate limiting to work

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
        // Strict Mode: If connectionId is known, MUST match.
        // if (connectionId) {
        //     convQuery = convQuery.eq('connection_id', connectionId);
        // } else {
        // For legacy compatibility, if we have no idea which connection, we might pick the most recent one 
        // OR specifically look for null. Let's filter for NULL to avoid accidental merging with specific lines.
        // But for now, to be safe with existing data (which has null), we allow null matching.
        // Actually, if we want to separate "Legacy" from "New Multi-Account", we should prefer null here.
        // However, users might migrate. Let's just not filter by connection_id if null, risks merging, but safe for single-account.
        // }

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

            // INSERT MESSAGE (Missing Link)
            // INSERT MESSAGE (Missing Link)
            let safeDate = new Date().toISOString()
            try {
                if (msg.timestamp) {
                    const ts = Number(msg.timestamp)
                    safeDate = new Date(ts * (ts < 100000000000 ? 1000 : 1)).toISOString()
                }
            } catch (e) { }

            const { error: msgError } = await supabase.from('messages').insert({
                conversation_id: existingConv.id,
                direction: 'inbound',
                channel: msg.channel,
                content: msg.content,
                status: 'received',
                external_id: msg.id,
                sender: msg.senderName || msg.from,
                created_at: safeDate
            })
            if (msgError) console.error('[InboxService] Failed to insert message into existing conv:', msgError)

            // Handle automation (auto-reply with rate limiting)
            if (matchedConnection) {
                await this.handleConnectionAutomation(supabase, matchedConnection, lead, existingLead, msg.from, orgId, existingConv.id);
            }

            return { data: existingConv, error: null, conversationId: existingConv.id, connectionId: existingConv.connection_id || connectionId, success: true }
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
            // Handle Race Condition (Unique Violation)
            if (createError.code === '23505') {
                console.warn('[InboxService] Race condition detected: Conversation already created. Fetching existing one.');
                const { data: existingRace } = await supabase.from('conversations')
                    .select('*')
                    .eq('lead_id', lead.id)
                    .eq('channel', msg.channel)
                    .eq('state', 'active')
                    .single();

                if (existingRace) {
                    console.log('[InboxService] Recovered from race condition using conversation:', existingRace.id);
                    // Use the racially discovered conversation as if it was existingConv
                    // We need to route this to the "insert message" logic below defined for targetConv

                    // Note: We skip the specific "New Conversation Automation" for this race case 
                    // because the other thread likely handled it.
                    // Or ideally we should ensure it runs? 
                    // If the other thread committed, it handled it.
                    // So we just return it to let message insertion happen?
                    // Actually the method continues to Step 5.

                    // We need to set newConv to existingRace to fall through to Step 5 properly?
                    // But 'targetConv' uses existingConv || newConv.
                    // So we can't easily assign to 'newConv' const. 
                    // I need to refactor variable usage or just return here?

                    // No, Step 5 (INSERT MESSAGE) is AFTER this block.
                    // I should define targetConv differently or assign to a let.
                    // refactoring variable declaration above.

                    // QUICK FIX: Recurse or Return?
                    // If I return here, Step 5 won't run for THIS execution.
                    // BUT Step 5 (Insert Message) handles the message for THIS execution.
                    // If I return, the message is lost?
                    // NO. Step 5 is ESSENTIAL.

                    // I will change the code to use 'let finalConv' instead of const newConv/existingConv mix.

                    // Actually, I can just throw if I don't handle it.
                    // Let's modify the code structure slightly to be safer.

                    // RE-PLAN:
                    // I will use `replace_file_content` to replace the entire block and introduce `targetConv` properly.
                }
            }

            if (!createError.code || createError.code !== '23505') {
                console.error('[InboxService] Failed to create conversation:', createError)
                return { data: null, error: createError, success: false }
            }
        }

        let targetConv = newConv;
        // If we had a collision, we need to fetch and set targetConv
        if (!targetConv && createError?.code === '23505') {
            const { data: recovered } = await supabase.from('conversations')
                .select('*')
                .eq('lead_id', lead.id)
                .eq('channel', msg.channel)
                .eq('state', 'active')
                .single();
            targetConv = recovered;
        }

        if (!targetConv) {
            return { success: false, error: new Error("Failed to resolve conversation after race condition") }
        }

        // 5. INSERT MESSAGE
        // const targetConv removed (already defined)
        let safeDate = new Date().toISOString()
        try {
            if (msg.timestamp) {
                const ts = Number(msg.timestamp)
                safeDate = new Date(ts * (ts < 100000000000 ? 1000 : 1)).toISOString()
            }
        } catch (e) { }

        // Avoid duplicate insertion if ID exists? Meta sends IDs.
        const { error: msgError } = await supabase.from('messages').insert({
            conversation_id: targetConv.id,
            direction: 'inbound',
            channel: msg.channel,
            content: msg.content,
            status: 'received',
            external_id: msg.id, // Meta ID
            sender: msg.senderName || msg.from,
            created_at: safeDate
        })

        if (msgError) console.error('[InboxService] Failed to insert message:', msgError)

        // Handle automation for NEW conversations (welcome message, pipeline assignment)
        // Only trigger if WE created it (newConv exists) to avoid duplicates or race condition double-trigger
        if (matchedConnection && newConv) {
            await this.handleConnectionAutomation(supabase, matchedConnection, lead, existingLead, msg.from, orgId, newConv.id);
        }

        console.log('[InboxService] Conversation ready:', targetConv.id)
        return { data: targetConv, error: null, conversationId: targetConv.id, connectionId: connectionId, success: true } // Ensure conversationId and connectionId returned
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

    /**
     * Handle automation logic (Pipeline, Working Hours, Auto-Reply, Welcome Message)
     */
    private async handleConnectionAutomation(
        supabase: SupabaseClient,
        connection: any,
        lead: any,
        existingLead: any,
        recipientPhone: string,
        orgId: string,
        conversationId?: string // For rate limiting auto-replies
    ) {
        const { outboundService } = await import("./outbound-service")

        // 1. Pipeline Auto-Assignment (New Leads Only)
        if (!existingLead && connection.default_pipeline_stage_id) {
            await this.assignPipelineStage(supabase, lead.id, connection.default_pipeline_stage_id);
        }

        // 2. Welcome Message (New Leads Only)
        if (!existingLead && connection.welcome_message) {
            try {
                console.log(`[InboxService] Sending welcome message to new lead ${lead.id}`)
                await outboundService.sendMessage(
                    connection.id,
                    recipientPhone,
                    connection.welcome_message,
                    orgId
                )
            } catch (error) {
                console.error("[InboxService] Failed to send welcome message:", error)
            }
        }

        // 3. Working Hours & Auto-Reply (Offline Message) with RATE LIMITING
        if (connection.working_hours && connection.auto_reply_when_offline) {
            const timezone = connection.working_hours.timezone || 'America/Bogota'
            const isOnline = this.isWithinWorkingHours(connection.working_hours, timezone)

            if (!isOnline) {
                // Rate limit check: Only send auto-reply once per hour per conversation
                let shouldSend = true

                if (conversationId) {
                    const { data: conv } = await supabase
                        .from('conversations')
                        .select('last_auto_reply_at')
                        .eq('id', conversationId)
                        .single()

                    if (conv?.last_auto_reply_at) {
                        const lastReply = new Date(conv.last_auto_reply_at)
                        const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
                        if (lastReply > hourAgo) {
                            shouldSend = false
                            console.log(`[InboxService] Rate limited: Already sent auto-reply within the hour`)
                        }
                    }
                }

                if (shouldSend) {
                    console.log(`[InboxService] Connection ${connection.id} is OFFLINE. Sending auto-reply.`)
                    try {
                        await outboundService.sendMessage(
                            connection.id,
                            recipientPhone,
                            connection.auto_reply_when_offline,
                            orgId
                        )

                        // Update last_auto_reply_at
                        if (conversationId) {
                            await supabase
                                .from('conversations')
                                .update({ last_auto_reply_at: new Date().toISOString() })
                                .eq('id', conversationId)
                        }
                    } catch (error) {
                        console.error("[InboxService] Failed to send auto-reply:", error)
                    }
                }
            }
        }
    }

    private isWithinWorkingHours(config: any, timezone: string = 'America/Bogota'): boolean {
        if (!config || !config.days || !config.start || !config.end) return true; // Default to always online if invalid

        // Get current time in the specified timezone
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
            timeZone: timezone,
            hour: 'numeric',
            minute: 'numeric',
            weekday: 'short',
            hour12: false
        }

        const formatter = new Intl.DateTimeFormat('en-US', options)
        const parts = formatter.formatToParts(now)

        const hourPart = parts.find(p => p.type === 'hour')
        const minutePart = parts.find(p => p.type === 'minute')
        const weekdayPart = parts.find(p => p.type === 'weekday')

        const currentHour = parseInt(hourPart?.value || '0')
        const currentMinute = parseInt(minutePart?.value || '0')
        const weekdayShort = weekdayPart?.value || 'Mon'

        // Map weekday to number (1=Mon, 7=Sun)
        const dayMap: Record<string, number> = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7 }
        const uiDay = dayMap[weekdayShort] || 1

        if (!config.days.includes(uiDay)) return false; // Not a working day

        const [hStart, mStart] = config.start.split(':').map(Number);
        const [hEnd, mEnd] = config.end.split(':').map(Number);

        const nowMinutes = currentHour * 60 + currentMinute;
        const startMinutes = hStart * 60 + mStart;
        const endMinutes = hEnd * 60 + mEnd;

        return nowMinutes >= startMinutes && nowMinutes < endMinutes;
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
                console.log(`[InboxService] Auto-assigned lead ${leadId} to stage ${stage.status_key}`);
            }
        } catch (error) {
            console.error('[InboxService] Failed to auto-assign pipeline stage:', error);
        }
    }
}

// Export singleton instance
export const inboxService = new InboxService()
