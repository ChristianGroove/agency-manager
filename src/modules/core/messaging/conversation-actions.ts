"use server"

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
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

    const { error } = await supabase
        .from('conversations')
        .update({
            state: 'archived',
            updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

    if (error) {
        console.error('[ConversationActions] Failed to archive:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/inbox')
    return { success: true }
}

/**
 * Delete a conversation (and all its messages)
 */
export async function deleteConversation(conversationId: string, deleteLeadIfOrphaned: boolean = false) {
    const supabase = await createClient()

    // 1. Fetch conversation info before delete
    const { data: conv } = await supabase
        .from('conversations')
        .select('lead_id, organization_id')
        .eq('id', conversationId)
        .single()

    // 1.5. CLEANUP PHYSICAL MEDIA (Prevent orphans in Storage)
    try { await messagingCleanupService.deleteConversationMedia(conversationId); } catch (e) { console.error("[ConversationActions] Media cleanup error:", e); }

    // CLEAR TAGS BEFORE DELETE (Surgical cleanup to avoid DB locks)
    await clearLeadTagsOnEvent(conversationId)

    const { error, count } = await supabase
        .from('conversations')
        .delete({ count: 'exact' })
        .eq('id', conversationId)

    if (error) {
        console.error('[ConversationActions] Failed to delete:', error)
        return { success: false, error: error.message }
    }

    if (count === 0) {
        console.error('[ConversationActions] No rows deleted. Likely permission denied or not found.')
        return { success: false, error: "Could not delete conversation. Permission denied or already deleted." }
    }

    // 2. Orphaned Lead Cleanup
    if (deleteLeadIfOrphaned && conv?.lead_id) {
        // Check if there are other conversations for this lead
        const { data: otherConvs } = await supabase
            .from('conversations')
            .select('id')
            .eq('lead_id', conv.lead_id)
            .limit(1)

        if (!otherConvs || otherConvs.length === 0) {
            // No other conversations remain, delete lead from CRM
            const { deleteLeads } = await import("@/modules/core/crm/lead-management-actions")
            await deleteLeads([conv.lead_id])
        }
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
 * Resolve and close a conversation
 */
export async function completeConversation(conversationId: string) {
    const supabase = await createClient()

    // 1. Fetch current metadata to preserve it
    const { data: conv } = await supabase
        .from('conversations')
        .select('metadata, lead_id, organization_id')
        .eq('id', conversationId)
        .single()

    const newMetadata = {
        ...(conv?.metadata || {}),
        resolved_at: new Date().toISOString()
    }

    // 2. Perform the update
    const { error } = await supabase
        .from('conversations')
        .update({
            status: 'closed',
            state: 'archived',
            metadata: newMetadata,
            updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

    if (error) {
        console.error('[ConversationActions] Failed to resolve:', error)
        return { success: false, error: error.message }
    }

    // 3. CLEAR TAGS AFTER RESOLVE (Surgical cleanup)
    if (conv?.lead_id && conv?.organization_id) {
        const { clearLeadTagsSystem } = await import("@/modules/core/crm/tags-actions")
        await clearLeadTagsSystem(conv.lead_id, conv.organization_id)
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
        const { clearLeadTagsSystem } = await import("@/modules/core/crm/tags-actions")
        await clearLeadTagsSystem(conv.lead_id, conv.organization_id)
    }
}
