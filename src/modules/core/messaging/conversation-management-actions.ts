"use server"

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

/**
 * Assign a conversation to a specific user/agent
 */
export async function assignConversation(conversationId: string, userId: string | null) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('conversations')
        .update({ assigned_to: userId, updated_at: new Date().toISOString() })
        .eq('id', conversationId)

    if (error) {
        console.error("Failed to assign conversation:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/inbox')
    return { success: true }
}

/**
 * Update conversation state (for drag-drop actions)
 * Uses supabaseAdmin to bypass RLS for reliable updates
 */
export async function updateConversationState(
    conversationId: string,
    updates: { state?: string; status?: string }
) {
    console.log('[updateConversationState] Called with:', { conversationId, updates })

    // Use admin client to bypass RLS issues
    const { supabaseAdmin } = await import("@/lib/supabase-admin")

    // Only update the 'state' column which we know exists
    // 'status' might not exist in all schemas
    const safeUpdates: any = { updated_at: new Date().toISOString() }
    if (updates.state) safeUpdates.state = updates.state

    console.log('[updateConversationState] Applying update:', safeUpdates)

    const { data, error } = await supabaseAdmin
        .from('conversations')
        .update(safeUpdates)
        .eq('id', conversationId)
        .select()

    if (error) {
        console.error("[updateConversationState] FAILED:", error)
        return { success: false, error: error.message }
    }

    console.log('[updateConversationState] SUCCESS:', data)

    revalidatePath('/crm/inbox')
    revalidatePath('/inbox')
    return { success: true }
}

/**
 * Archive a conversation
 */
export async function archiveConversation(conversationId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('conversations')
        .update({ state: 'archived', updated_at: new Date().toISOString() })
        .eq('id', conversationId)

    if (error) {
        console.error("Failed to archive conversation:", error)
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
        .update({ state: 'active', updated_at: new Date().toISOString() })
        .eq('id', conversationId)

    if (error) {
        console.error("Failed to unarchive conversation:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/inbox')
    return { success: true }
}

/**
 * Mark conversation as spam
 */
export async function markAsSpam(conversationId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('conversations')
        .update({ state: 'spam', updated_at: new Date().toISOString() })
        .eq('id', conversationId)

    if (error) {
        console.error("Failed to mark as spam:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/inbox')
    return { success: true }
}

/**
 * Set conversation priority
 */
export async function setConversationPriority(conversationId: string, priority: 'urgent' | 'high' | 'normal' | 'low') {
    const supabase = await createClient()

    const { error } = await supabase
        .from('conversations')
        .update({ priority, updated_at: new Date().toISOString() })
        .eq('id', conversationId)

    if (error) {
        console.error("Failed to set priority:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/inbox')
    return { success: true }
}

/**
 * Add/update tags on a conversation
 */
export async function tagConversation(conversationId: string, tags: string[]) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('conversations')
        .update({ tags, updated_at: new Date().toISOString() })
        .eq('id', conversationId)

    if (error) {
        console.error("Failed to tag conversation:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/inbox')
    return { success: true }
}

/**
 * Search conversations
 */
export async function searchConversations(query: string, filters?: {
    state?: 'active' | 'archived' | 'spam'
    assignedTo?: string
    priority?: 'urgent' | 'high' | 'normal' | 'low'
    tags?: string[]
}) {
    const supabase = await createClient()

    let queryBuilder = supabase
        .from('conversations')
        .select('*, leads(name, phone)')
        .order('last_message_at', { ascending: false })

    // Text search
    if (query) {
        queryBuilder = queryBuilder.textSearch('last_message', query, {
            type: 'websearch',
            config: 'english'
        })
    }

    // Filters
    if (filters?.state) {
        queryBuilder = queryBuilder.eq('state', filters.state)
    }
    if (filters?.assignedTo) {
        queryBuilder = queryBuilder.eq('assigned_to', filters.assignedTo)
    }
    if (filters?.priority) {
        queryBuilder = queryBuilder.eq('priority', filters.priority)
    }
    if (filters?.tags && filters.tags.length > 0) {
        queryBuilder = queryBuilder.contains('tags', filters.tags)
    }

    const { data, error } = await queryBuilder

    if (error) {
        console.error("Failed to search conversations:", error)
        return { success: false, error: error.message, data: [] }
    }

    return { success: true, data }
}

/**
 * Bulk archive conversations
 */
export async function bulkArchiveConversations(conversationIds: string[]) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('conversations')
        .update({ state: 'archived', updated_at: new Date().toISOString() })
        .in('id', conversationIds)

    if (error) {
        console.error("Failed to bulk archive:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/inbox')
    return { success: true }
}

/**
 * Bulk assign conversations
 */
export async function bulkAssignConversations(conversationIds: string[], userId: string | null) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('conversations')
        .update({ assigned_to: userId, updated_at: new Date().toISOString() })
        .in('id', conversationIds)

    if (error) {
        console.error("Failed to bulk assign:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/inbox')
    return { success: true }
}
