"use server"

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"
import { messagingCleanupService } from "./cleanup-service"

/**
 * Returns the active integration_connection IDs for the current org.
 * Used by GlobalMessageListener to filter cross-tenant message popups.
 */
export async function getOrgConnectionIds(): Promise<string[]> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    const { data } = await supabase
        .from('integration_connections')
        .select('id')
        .eq('organization_id', orgId)
        .eq('status', 'active')

    return (data || []).map((c: { id: string }) => c.id)
}


/**
 * Archive a conversation
 */
export async function archiveConversation(conversationId: string) {
    const supabase = await createClient()

    // Fetch orgId for broadcast
    const { data: conv } = await supabase
        .from('conversations')
        .select('organization_id')
        .eq('id', conversationId)
        .single()

    const orgId = conv?.organization_id

    // 4. Update conversation state to archived
    const { error: updateError } = await supabase
        .from('conversations')
        .update({
            state: 'archived',
            updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

    if (updateError) {
        console.error('[ConversationActions] Failed to resolve:', updateError)
        return { success: false, error: updateError.message }
    }

    // BROADCAST: Notify other agents so the card vanishes in their inboxes too
    if (orgId) {
        broadcastVanish(orgId, conversationId).catch(e => console.error("[ConversationActions] Broadcast error:", e))
    }

    revalidatePath('/inbox')
    return { success: true }
}

/**
 * Broadcast a vanish event to all organization members via Realtime
 */
async function broadcastVanish(organizationId: string, conversationId: string) {
    const supabase = await createClient()
    const channelName = `inbox-org-${organizationId}`
    const channel = supabase.channel(channelName)
    
    // We don't subscribe, just send a broadcast.
    // This is a one-way fire-and-forget message.
    await channel.send({
        type: 'broadcast',
        event: 'vanish',
        payload: { conversationId }
    })
    
    // Cleanup temporary channel instance
    await supabase.removeChannel(channel)
}

/**
 * Delete a conversation (Optimized)
 */
export async function deleteConversation(conversationId: string, deleteLeadIfOrphaned: boolean = false) {
    const supabase = await createClient()

    // 1. Fetch conversation info (Fast)
    const { data: conv } = await supabase
        .from('conversations')
        .select('lead_id, organization_id')
        .eq('id', conversationId)
        .single()

    if (!conv) return { success: false, error: "Conversation not found" }

    const orgId = conv.organization_id;

    // 2. PARALLEL CLEANUP: Media + Tags + Delete Transaction (Conceptually)
    // We start media cleanup as early as possible
    const mediaCleanupPromise = messagingCleanupService.deleteConversationMedia(conversationId)
        .catch(e => console.error("[ConversationActions] Media cleanup error:", e));

    // Clear tags using the IDs we ALREADY have (No new fetch needed)
    const tagCleanupPromise = (conv.lead_id && conv.organization_id)
        ? (async () => {
            const { clearContactTagsAction } = await import("@/modules/features/crm/crm-actions")
            return clearContactTagsAction(conv.lead_id!)
        })()
        : Promise.resolve({ success: true });

    // Wait for tag cleanup to prevent race conditions on denormalized fields, then delete
    await tagCleanupPromise;

    const { error, count } = await supabase
        .from('conversations')
        .delete({ count: 'exact' })
        .eq('id', conversationId)

    if (error) {
        console.error('[ConversationActions] Failed to delete:', error)
        return { success: false, error: error.message }
    }

    // 3. Optional Orphaned Lead Cleanup
    if (deleteLeadIfOrphaned && conv.lead_id) {
        const { data: otherConvs } = await supabase
            .from('conversations')
            .select('id')
            .eq('lead_id', conv.lead_id)
            .limit(1)

        if (!otherConvs || otherConvs.length === 0) {
            const { deleteContactsAction } = await import("@/modules/features/crm/crm-actions")
            await deleteContactsAction([conv.lead_id])
        }
    }

    // Ensure media cleanup finished at some point (we await it here to ensure consistency before returning)
    await mediaCleanupPromise;

    // 4. MULTI-AGENT BROADCAST (Critical for real-time consistency)
    if (orgId) {
        broadcastVanish(orgId, conversationId).catch(e => console.error("[ConversationActions] Broadcast error:", e))
    }

    revalidatePath('/inbox')
    revalidatePath('/crm')
    return { success: true }
}

/**
 * Mark conversation as read
 */
export async function markAsRead(conversationId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('conversations')
        .update({
            unread_count: 0,
            updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

    if (error) {
        console.error('[ConversationActions] Failed to mark as read:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/inbox')
    return { success: true }
}

/**
 * Unarchive a conversation
 */
export async function unarchiveConversation(conversationId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('conversations')
        .update({
            state: 'active',
            updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

    if (error) {
        console.error('[ConversationActions] Failed to unarchive:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/inbox')
    return { success: true }
}

/**
 * Snooze a conversation
 */
export async function snoozeConversation(conversationId: string, until: Date) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('conversations')
        .update({
            status: 'snoozed',
            snoozed_until: until.toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

    if (error) {
        console.error('[ConversationActions] Failed to snooze:', error)
        return { success: false, error: error.message }
    }

    // BROADCAST: Notify other agents
    const { data: convInfo } = await supabase.from('conversations').select('organization_id').eq('id', conversationId).single()
    if (convInfo?.organization_id) {
        broadcastVanish(convInfo.organization_id, conversationId).catch(e => {})
    }

    revalidatePath('/inbox')
    return { success: true }
}

/**
 * Get the last few messages for a lead's most recent conversation
 */
export async function getLeadConversationPreview(leadId: string, limit: number = 3) {
    const supabase = await createClient()

    // 1. Get most recent conversation for this lead
    const { data: conversation, error: convError } = await supabase
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
    const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (msgError) {
        console.error('[GetLeadPreview] Failed to fetch messages:', msgError)
        return { success: false, error: msgError.message }
    }

    // Return reversed so they appear chronologically if needed
    return { success: true, messages: messages.reverse(), conversationId: conversation.id }
}

/**
 * Resolve and close a conversation (Optimized)
 */
export async function completeConversation(conversationId: string) {
    const supabase = await createClient()

    // 1. Initial Fetch (Fast)
    const { data: conv } = await supabase
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
    const updatePromise = supabase.from('conversations').update({
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
        console.error('[ConversationActions] Failed to resolve:', updateResult.error)
        return { success: false, error: updateResult.error.message }
    }

    // BROADCAST: Notify other agents
    if (conv.organization_id) {
        broadcastVanish(conv.organization_id, conversationId).catch(e => {})
    }

    revalidatePath('/inbox')
    return { success: true }
}

/**
 * Internal helper to clear tags for a lead during resolution/deletion
 */
async function clearLeadTagsOnEvent(conversationId: string) {
    const supabase = await createClient()
    const { data: conv } = await supabase
        .from('conversations')
        .select('lead_id, organization_id')
        .eq('id', conversationId)
        .single()

    if (conv?.lead_id && conv?.organization_id) {
        const { clearContactTagsAction } = await import("@/modules/features/crm/crm-actions")
        await clearContactTagsAction(conv.lead_id)
    }
}

