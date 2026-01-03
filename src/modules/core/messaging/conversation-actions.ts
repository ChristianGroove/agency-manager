"use server"

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

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
export async function deleteConversation(conversationId: string) {
    const supabase = await createClient()

    // Messages will be deleted automatically by CASCADE
    const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)

    if (error) {
        console.error('[ConversationActions] Failed to delete:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/inbox')
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
