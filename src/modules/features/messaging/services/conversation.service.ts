import { messagingCleanupService } from '@/modules/features/messaging/cleanup-service';
async function broadcastVanish(organizationId: string, conversationId: string) {
    const { createClient } = await import('@/modules/core/database/supabase-server');
    const supabase = await createClient();
    await supabase.channel('inbox-org-' + organizationId).send({
        type: 'broadcast',
        event: 'vanish',
        payload: { conversationId }
    });
}
import { SupabaseClient } from '@supabase/supabase-js';


const PUBLIC_CONVERSATION_ACTION_ERROR = "Conversation action failed"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function publicConversationActionError(error: unknown, fallback = PUBLIC_CONVERSATION_ACTION_ERROR) {
    if (isDeployedRuntime()) {
        return fallback
    }

    if (error instanceof Error && error.message) {
        return error.message
    }

    if (error && typeof error === 'object') {
        const message = (error as { message?: unknown }).message
        if (typeof message === 'string' && message.length > 0) {
            return message
        }
    }

    return fallback
}

function sanitizeConversationActionLogDetails(details: Record<string, unknown> = {}) {
    const sensitiveKeys = new Set([
        'conversationId',
        'leadId',
        'organizationId',
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

function summarizeConversationActionError(error: unknown) {
    if (error instanceof Error) return { name: error.name }
    if (error && typeof error === 'object') {
        return { type: 'object', code: (error as { code?: unknown }).code, hasMessage: typeof (error as { message?: unknown }).message === 'string' }
    }
    return { type: typeof error }
}

function logConversationActionError(label: string, error: unknown, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        if (Object.keys(details).length > 0) console.error(label, error, details)
        else console.error(label, error)
        return
    }
    console.error(label, { ...sanitizeConversationActionLogDetails(details), detail: summarizeConversationActionError(error) })
}


export class ConversationService {
    constructor(private supabase: SupabaseClient, private orgId: string) {}

    async getOrgConnectionIds(): Promise<string[]> {
        if (!this.orgId) return []
        const { data } = await this.supabase
            .from('integration_connections')
            .select('id')
            .eq('organization_id', this.orgId)
            .eq('status', 'active')
        return (data || []).map((c: { id: string }) => c.id)
    }

    
    async archiveConversation(conversationId: string) {
        // Fetch orgId for broadcast
        const { data: conv } = await this.supabase
            .from('conversations')
            .select('organization_id')
            .eq('id', conversationId)
            .single()
    
        const orgId = conv?.organization_id
    
        // 4. Update conversation state to archived
        const { error: updateError } = await this.supabase
            .from('conversations')
            .update({
                state: 'archived',
                updated_at: new Date().toISOString()
            })
            .eq('id', conversationId)
    
        if (updateError) {
            logConversationActionError('[ConversationActions] Failed to archive:', updateError, { conversationId })
            return { success: false, error: publicConversationActionError(updateError) }
        }
    
        // BROADCAST: Notify other agents so the card vanishes in their inboxes too
        if (orgId) {
            broadcastVanish(orgId, conversationId).catch(e => logConversationActionError("[ConversationActions] Broadcast error:", e, {
                conversationId,
                organizationId: orgId,
            }))
        }
    
        return { success: true }
    }

    async deleteConversation(conversationId: string, deleteLeadIfOrphaned: boolean = false) {
        // 1. Fetch conversation info (Fast)
        const { data: conv } = await this.supabase
            .from('conversations')
            .select('lead_id, organization_id')
            .eq('id', conversationId)
            .single()
    
        if (!conv) return { success: false, error: "Conversation not found" }
    
        const orgId = conv.organization_id;
    
        // 2. PARALLEL CLEANUP: Media + Tags + Delete Transaction (Conceptually)
        // We start media cleanup as early as possible
        const mediaCleanupPromise = messagingCleanupService.deleteConversationMedia(conversationId)
            .catch(e => logConversationActionError("[ConversationActions] Media cleanup error:", e, { conversationId }));
    
        // Clear tags using the IDs we ALREADY have (No new fetch needed)
        const tagCleanupPromise = (conv.lead_id && conv.organization_id)
            ? (async () => {
                const { clearContactTagsAction } = await import("@/modules/features/crm/crm-actions")
                return clearContactTagsAction(conv.lead_id!)
            })()
            : Promise.resolve({ success: true });
    
        // Wait for tag cleanup to prevent race conditions on denormalized fields, then delete
        await tagCleanupPromise;
    
        const { error, count } = await this.supabase
            .from('conversations')
            .delete({ count: 'exact' })
            .eq('id', conversationId)
    
        if (error) {
            logConversationActionError('[ConversationActions] Failed to delete:', error, {
                conversationId,
                leadId: conv.lead_id,
                organizationId: orgId,
            })
            return { success: false, error: publicConversationActionError(error) }
        }
    
        // 4. MULTI-AGENT BROADCAST (Critical for real-time consistency)
        // Emit immedately after DB delete to ensure all clients vanish the item
        if (orgId) {
            broadcastVanish(orgId, conversationId).catch(e => logConversationActionError("[ConversationActions] Broadcast error:", e, {
                conversationId,
                organizationId: orgId,
            }))
        }
    
        // 5. Optional Orphaned Lead Cleanup
        if (deleteLeadIfOrphaned && conv.lead_id) {
            const { data: otherConvs } = await this.supabase
                .from('conversations')
                .select('id')
                .eq('lead_id', conv.lead_id)
                .limit(1)
    
            if (!otherConvs || otherConvs.length === 0) {
                const { deleteContactsAction } = await import("@/modules/features/crm/crm-actions")
                await deleteContactsAction([conv.lead_id])
            }
        }
    
        // Ensure heavy media cleanup finished before returning, 
        // but the UI has already been notified to vanish the item via broadcast above.
        await mediaCleanupPromise;
    
        return { success: true }
    }

    async markAsRead(conversationId: string) {
        const { error } = await this.supabase
            .from('conversations')
            .update({
                unread_count: 0,
                updated_at: new Date().toISOString()
            })
            .eq('id', conversationId)
    
        if (error) {
            logConversationActionError('[ConversationActions] Failed to mark as read:', error, { conversationId })
            return { success: false, error: publicConversationActionError(error) }
        }
    
        return { success: true }
    }

    async unarchiveConversation(conversationId: string) {
        const { error } = await this.supabase
            .from('conversations')
            .update({
                state: 'active',
                updated_at: new Date().toISOString()
            })
            .eq('id', conversationId)
    
        if (error) {
            logConversationActionError('[ConversationActions] Failed to unarchive:', error, { conversationId })
            return { success: false, error: publicConversationActionError(error) }
        }
    
        return { success: true }
    }

    async snoozeConversation(conversationId: string, until: Date) {
        const { error } = await this.supabase
            .from('conversations')
            .update({
                status: 'snoozed',
                snoozed_until: until.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', conversationId)
    
        if (error) {
            logConversationActionError('[ConversationActions] Failed to snooze:', error, { conversationId })
            return { success: false, error: publicConversationActionError(error) }
        }
    
        // BROADCAST: Notify other agents
        const { data: convInfo } = await this.supabase.from('conversations').select('organization_id').eq('id', conversationId).single()
        if (convInfo?.organization_id) {
            broadcastVanish(convInfo.organization_id, conversationId).catch(e => {})
        }
    
        return { success: true }
    }

    async getLeadConversationPreview(leadId: string, limit: number = 3) {
        // 1. Get most recent conversation for this lead
        const { data: conversation, error: convError } = await this.supabase
            .from('conversations')
            .select('id')
            .eq('lead_id', leadId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single()
    
        if (convError || !conversation) {
            return { success: false, error: "No conversation found" }
        }
    
        // 2. Get last N messages
        const { data: messages, error: msgError } = await this.supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: false })
            .limit(limit)
    
        if (msgError) {
            logConversationActionError('[GetLeadPreview] Failed to fetch messages:', msgError, {
                conversationId: conversation.id,
                leadId,
            })
            return { success: false, error: publicConversationActionError(msgError) }
        }
    
        // Return reversed so they appear chronologically if needed
        return { success: true, messages: messages.reverse(), conversationId: conversation.id }
    }

    async completeConversation(conversationId: string) {
        // 1. Initial Fetch (Fast)
        const { data: conv } = await this.supabase
            .from('conversations')
            .select('metadata, lead_id, organization_id')
            .eq('id', conversationId)
            .single()
    
        if (!conv) return { success: false, error: "Conversation not found" }
    
        const newMetadata = {
            ...(conv.metadata || {}),
            resolved_at: new Date().toISOString()
        }
    
        // 2. PARALLEL EXECUTION: Update DB + Clear Tags in background
        const updatePromise = this.supabase.from('conversations').update({
            status: 'closed',
            state: 'archived',
            metadata: newMetadata,
            updated_at: new Date().toISOString()
        }).eq('id', conversationId);
    
        const tagCleanupPromise = (conv.lead_id && conv.organization_id)
            ? (async () => {
                const { clearContactTagsAction } = await import("@/modules/features/crm/crm-actions")
                return clearContactTagsAction(conv.lead_id!)
            })()
            : Promise.resolve({ success: true });
    
        const [updateResult, tagResult] = await Promise.all([updatePromise, tagCleanupPromise]);
    
        if (updateResult.error) {
            logConversationActionError('[ConversationActions] Failed to resolve:', updateResult.error, {
                conversationId,
                leadId: conv.lead_id,
                organizationId: conv.organization_id,
            })
            return { success: false, error: publicConversationActionError(updateResult.error) }
        }
    
        // BROADCAST: Notify other agents
        if (conv.organization_id) {
            broadcastVanish(conv.organization_id, conversationId).catch(e => {})
        }
    
        return { success: true }
    }

    // This is just a PoC for Phase 3! Real extraction will follow progressively.
}
