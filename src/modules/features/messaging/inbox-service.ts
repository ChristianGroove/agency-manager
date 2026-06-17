import { createClient } from "@/modules/core/database/supabase-server"
import type { IncomingMessage } from "@/modules/features/messaging/providers/types"
import { ChannelType } from "@/types/messaging"
import { SupabaseClient } from "@supabase/supabase-js"
import { normalizePhone } from "@/modules/infrastructure/utils/normalize-phone"
import { ChannelResolver, ConnectionMatch } from "@/modules/features/messaging/channel-resolver"
import { BusinessHoursEngine } from "@/modules/features/messaging/business-hours"
import { MessagingPersistence } from "./services/persistence"
import { LeadLifecycleManager } from "@/modules/features/crm/services/logic/lead-lifecycle-manager"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV
}

function sanitizeInboxLogDetails(details: Record<string, unknown> = {}) {
    const sensitiveKeys = new Set([
        'connectionId',
        'conversationId',
        'externalId',
        'from',
        'leadId',
        'metadata',
        'organizationId',
        'phone',
        'recipientPhone',
        'stageId',
    ])

    return Object.fromEntries(
        Object.entries(details).map(([key, value]) => {
            if (sensitiveKeys.has(key)) {
                return [`${key}Present`, Boolean(value)]
            }

            return [key, value]
        })
    )
}

function summarizeInboxError(error: unknown) {
    return error instanceof Error
        ? { name: error.name }
        : { type: typeof error }
}

function logInboxInfo(label: string, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        console.log(label, details)
        return
    }

    console.log(label, sanitizeInboxLogDetails(details))
}

function logInboxWarning(label: string, error: unknown, details?: Record<string, unknown>) {
    if (!isDeployedRuntime()) {
        if (details) console.warn(label, error, details)
        else console.warn(label, error)
        return
    }

    console.warn(label, {
        ...(details ? sanitizeInboxLogDetails(details) : {}),
        detail: summarizeInboxError(error),
    })
}

function logInboxError(label: string, error: unknown, details?: Record<string, unknown>) {
    if (!isDeployedRuntime()) {
        if (details) console.error(label, error, details)
        else console.error(label, error)
        return
    }

    console.error(label, {
        ...(details ? sanitizeInboxLogDetails(details) : {}),
        detail: summarizeInboxError(error),
    })
}

export class InboxService {

    /**
     * Process and save an incoming message to the database
     */
    async handleIncomingMessage(msg: IncomingMessage, supabase?: SupabaseClient) {
        if (!supabase) supabase = await createClient()
        logInboxInfo('[InboxService] handleIncomingMessage', { from: msg.from, channel: msg.channel })

        // 1. Idempotency Check (Primary)
        if (msg.externalId) {
            const { data: existingMsg } = await supabase
                .from('messages')
                .select('id, conversation_id, conversations(lead_id)')
                .eq('external_id', msg.externalId)
                .maybeSingle()

            if (existingMsg) {
                logInboxInfo('[InboxService] Duplicate message detected', { externalId: msg.externalId })
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
            logInboxInfo('[InboxService] Rejected: no matching integration connection found', {
                from: msg.from,
                metadata: msg.metadata,
            })
            return { success: false, error: 'Tenant isolation: No matching connection' }
        }
        logInboxInfo('[InboxService] Match found', {
            connectionId: match.connectionId,
            organizationId: match.organizationId,
        })

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
                logInboxInfo('[InboxService] Atomic duplicate detected', { externalId: msg.externalId })
                return { success: true, conversationId: conversation.id }
            }
            logInboxError('[InboxService] Failed to save message:', msgError, {
                conversationId: conversation.id,
                organizationId: match.organizationId,
            })
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

            // 5. REACTIVE LEAD LIFECYCLE (Innovative sync)
            if (lead?.id) {
                const lifecycleManager = new LeadLifecycleManager(supabase);
                // Background execution to maintain high-frequency inbox performance
                lifecycleManager.handleLeadIncomingActivity(lead.id, match.organizationId).catch(err => 
                    logInboxError('[InboxService] Lifecycle Manager Error:', err, {
                        leadId: lead.id,
                        organizationId: match.organizationId,
                    })
                );
            }
        }

        return { success: true, conversationId: conversation.id }
    }

    private async triggerAutomation(msg: IncomingMessage, conversationId: string, leadId: string, connectionId?: string) {
        logInboxInfo('[InboxService] triggerAutomation called', { conversationId, leadId, connectionId })
        try {
            const { automationTrigger } = await import("../automation/automation-trigger.service")
            logInboxInfo('[InboxService] Calling evaluateInput')
            await automationTrigger.evaluateInput(
                typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
                conversationId,
                msg.channel,
                msg.from,
                leadId,
                connectionId,
                msg.id || msg.externalId || undefined
            ).catch(err => logInboxError('[InboxService] Automation Trigger Error:', err, { conversationId, leadId, connectionId }))
            logInboxInfo('[InboxService] evaluateInput completed')
        } catch (e) {
            logInboxWarning('[InboxService] Failed to load automation service:', e, { conversationId, leadId, connectionId })
        }
    }

    private async resolveMetadataContext(msg: IncomingMessage, match: ConnectionMatch, supabase: SupabaseClient) {
        const { organizationId, connectionId } = match
        const normalizedPhone = normalizePhone(msg.from)
        
        logInboxInfo('[InboxService] Resolving context', {
            organizationId,
            phone: normalizedPhone,
            connectionId,
        });

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
            logInboxInfo('[InboxService] Existing lead found', { leadId: lead.id });
            // ... (rest of update logic)
        } else {
            logInboxInfo('[InboxService] Lead not found. Creating new lead', { phone: normalizedPhone, organizationId });
            const { data: newLead, error: leadInsertError } = await supabase.from('leads').insert({
                organization_id: organizationId,
                phone: normalizedPhone,
                name: msg.senderName || normalizedPhone,
                avatar_url: msg.senderAvatarUrl,
                status: 'new',
                source_connection_id: connectionId
            }).select().single()

            if (leadInsertError) {
                logInboxError('[InboxService] Error creating lead:', leadInsertError, { organizationId, phone: normalizedPhone });
            }
            lead = newLead
            isNewLead = true
        }

        if (!lead) {
            logInboxError('[InboxService] CRITICAL: Lead resolution failed', new Error('lead_resolution_failed'), {
                organizationId,
                phone: normalizedPhone,
            });
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

    // ... (rest of update logic)

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
            // We only update status to the status_key of the stage if we could resolve it, 
            // but for now, we leave this for the LeadLifecycleManager or simple status update.
            // Removing direct reference to pipeline_stage_id as it is not in the schema.
        }

        // 2. Working Hours & Auto-Reply (Offline Message) with RATE LIMITING
        const timezone = connection.working_hours?.timezone || 'America/Bogota'
        const isOnline = this.isWithinWorkingHours(connection.working_hours, timezone)
        
        logInboxInfo('[InboxService] Business hours status', { isOnline, timezone });

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
                    logInboxInfo('[InboxService] Auto-reply sent successfully', {
                        conversationId,
                        organizationId: orgId,
                    });
                } catch (error: any) {
                    logInboxError('[InboxService] ERROR sending auto-reply:', error, {
                        conversationId,
                        organizationId: orgId,
                        recipientPhone,
                    });
                }
            }
            return;
        } else if (!isOnline) {
            logInboxInfo('[InboxService] Channel is offline but no auto-reply message is configured', {
                organizationId: orgId,
            });
        }

        // 3. Welcome Message (New Leads Only) - ONLY if Online
        if (!existingLead && connection.welcome_message && isOnline) {
            try {
                logInboxInfo('[InboxService] Sending welcome message to new lead', { leadId: lead.id })
                await outboundService.sendMessage(
                    connection.id,
                    recipientPhone,
                    connection.welcome_message,
                    orgId,
                    { connection }
                )
            } catch (error: any) {
                logInboxError('[InboxService] Failed to send welcome message:', error, {
                    leadId: lead.id,
                    organizationId: orgId,
                    recipientPhone,
                })
            }
        }
    }

    // Method moved to MessagingPersistence

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
                logInboxInfo('[InboxService] Auto-assigned lead to stage', { leadId, stageStatus: stage.status_key });
            }
        } catch (error) {
            logInboxError('[InboxService] Failed to auto-assign pipeline stage:', error, { leadId, stageId });
        }
    }
}

// Export singleton instance
export const inboxService = new InboxService()
