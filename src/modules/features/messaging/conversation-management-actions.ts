"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { isSuperAdmin } from "@/modules/core/iam/services/platform-roles"
import { revalidatePath } from "next/cache"
import { normalizePhone } from "@/modules/infrastructure/utils/normalize-phone"

/**
 * Assign a conversation to a specific user/agent
 */
export async function assignConversation(conversationId: string, userId: string | null) {
    if (!userId) {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: "Unauthorized" }

        const { supabaseAdmin } = await import("@/modules/core/database/supabase-admin")
        const { data: current, error: currentError } = await supabaseAdmin
            .from('conversations')
            .select('organization_id')
            .eq('id', conversationId)
            .single()

        if (currentError || !current) {
            if (currentError) logConversationManagementError("[assignConversation] Read failed:", currentError, { conversationId })
            return { success: false, error: publicConversationManagementError(currentError, "Conversation not found") }
        }

        const { data: membership } = await supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', current.organization_id)
            .eq('user_id', user.id)
            .maybeSingle()

        if (!membership && !(await isSuperAdmin(user.id))) {
            return { success: false, error: "Unauthorized" }
        }

        const { error } = await supabaseAdmin
            .from('conversations')
            .update({ assigned_to: null, updated_at: new Date().toISOString() })
            .eq('id', conversationId)
            .eq('organization_id', current.organization_id)

        if (error) return { success: false, error: error.message }
        revalidatePath('/inbox')
        return { success: true }
    }

    const { transferConversation } = await import("./transfer-service")

    // Get current sender if possible (authenticated user)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const result = await transferConversation(conversationId, user.id, userId, "Manual assignment")

    if (!result.success) {
        return { success: false, error: result.error }
    }

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const { supabaseAdmin } = await import("@/modules/core/database/supabase-admin")

    const { data: current, error: currentError } = await supabaseAdmin
        .from('conversations')
        .select('organization_id, metadata')
        .eq('id', conversationId)
        .single()

    if (currentError || !current) {
        if (currentError) logConversationManagementError("[updateConversationState] Read failed:", currentError, { conversationId })
        return { success: false, error: publicConversationManagementError(currentError, "Conversation not found") }
    }

    const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', current.organization_id)
        .eq('user_id', user.id)
        .maybeSingle()

    if (!membership && !(await isSuperAdmin(user.id))) {
        return { success: false, error: "Unauthorized" }
    }

    const safeUpdates: any = { updated_at: new Date().toISOString() }
    if (updates.state) safeUpdates.state = updates.state
    if (updates.status) safeUpdates.status = updates.status

    if (updates.status === 'closed' || updates.state === 'archived') {
        safeUpdates.metadata = {
            ...(current?.metadata || {}),
            resolved_at: new Date().toISOString()
        }
        safeUpdates.is_bot_active = false
        safeUpdates.waiting_since = null
    }

    const { data, error } = await supabaseAdmin
        .from('conversations')
        .update(safeUpdates)
        .eq('id', conversationId)
        .eq('organization_id', current.organization_id)
        .select()

    if (error) {
        console.error("[updateConversationState] FAILED:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/crm/inbox')
    revalidatePath('/inbox')
    return { success: true }
}

/**
 * Archive a conversation
 */
export async function archiveConversation(conversationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const { data: current } = await supabase
        .from('conversations')
        .select('metadata')
        .eq('id', conversationId)
        .single()

    const { error } = await supabase
        .from('conversations')
        .update({
            state: 'archived',
            status: 'closed',
            is_bot_active: false,
            waiting_since: null,
            metadata: {
                ...(current?.metadata || {}),
                resolved_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
        })
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

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

    if (query) {
        queryBuilder = queryBuilder.textSearch('last_message', query, {
            type: 'websearch',
            config: 'english'
        })
    }

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

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
 * Bulk Assign Conversations
 */
export async function bulkAssignConversations(conversationIds: string[], userId: string | null) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const uniqueConversationIds = Array.from(new Set(conversationIds))

    if (userId && uniqueConversationIds.length > 0) {
        const { data: conversations, error: conversationError } = await supabase
            .from('conversations')
            .select('id, organization_id')
            .in('id', uniqueConversationIds)

        if (conversationError) {
            logConversationManagementError("Failed to validate bulk assign conversations:", conversationError, { conversationIds, userId })
            return { success: false, error: publicConversationManagementError(conversationError) }
        }

        if (!conversations || conversations.length !== uniqueConversationIds.length) {
            return { success: false, error: "Unauthorized" }
        }

        const organizationIds = Array.from(new Set(
            conversations
                .map(conversation => conversation.organization_id)
                .filter((organizationId): organizationId is string => typeof organizationId === 'string' && organizationId.length > 0)
        ))

        if (organizationIds.length === 0) return { success: false, error: "Unauthorized" }

        const { data: memberships, error: membershipError } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', userId)
            .in('organization_id', organizationIds)

        if (membershipError) {
            logConversationManagementError("Failed to validate bulk assign target:", membershipError, { conversationIds, userId })
            return { success: false, error: publicConversationManagementError(membershipError) }
        }

        const membershipOrganizationIds = new Set(memberships?.map(membership => membership.organization_id) || [])
        if (organizationIds.some(organizationId => !membershipOrganizationIds.has(organizationId))) {
            return { success: false, error: "Target agent is not a member of every selected organization" }
        }
    }

    const { error } = await supabase
        .from('conversations')
        .update({ assigned_to: userId, updated_at: new Date().toISOString() })
        .in('id', uniqueConversationIds)

    if (error) {
        console.error("Failed to bulk assign:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/inbox')
    return { success: true }
}

/**
 * Create or get existing conversation for a lead, client, or raw phone.
 * When a raw phone is provided, it first checks for existing Client/Lead,
 * then creates a new Lead if none found.
 */
export async function createConversation(input: { lead_id?: string, client_id?: string, phone?: string, channel?: string, connection_id?: string }) {
    const supabase = await createClient()
    const { lead_id, client_id, phone, channel, connection_id } = input

    if (!lead_id && !client_id && !phone) {
        return { success: false, error: 'Must provide either lead_id, client_id, or phone' }
    }

    // Helper to get Org ID from authenticated user
    const getOrgId = async () => {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return null

        const { data: member } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id)
            .limit(1)
            .single()

        return member?.organization_id
    }

    // Resolve Entity
    let finalClientId = client_id
    let finalLeadId = lead_id
    let resolvedOrgId: string | null = null

    if (!finalClientId && !finalLeadId && phone) {
        const normalizedPhone = normalizePhone(phone)
        // A. Check for existing Client
        const { data: existingClient } = await supabase
            .from('leads')
            .select('id, organization_id')
            .eq('phone', normalizedPhone)
            .single()

        if (existingClient) {
            finalClientId = existingClient.id
            resolvedOrgId = existingClient.organization_id
        } else {
            // B. Check for existing Lead
            const { data: existingLead } = await supabase
                .from('leads')
                .select('id, organization_id')
                .eq('phone', normalizedPhone)
                .single()

            if (existingLead) {
                finalLeadId = existingLead.id
                resolvedOrgId = existingLead.organization_id
            } else {
                // C. Create new Lead (Quick Contact)
                const orgId = await getOrgId()
                if (!orgId) return { success: false, error: 'No organization found for user.' }

                const { data: newLead, error: leadError } = await supabase
                    .from('leads')
                    .insert({
                        organization_id: orgId,
                        name: normalizedPhone,
                        phone: normalizedPhone,
                        status: 'new',
                        source: 'direct_chat'
                    })
                    .select()
                    .single()

                if (leadError) return { success: false, error: 'Failed to create lead: ' + leadError.message }
                finalLeadId = newLead.id
                resolvedOrgId = orgId
            }
        }
    }

    // 1. Check if an active conversation already exists
    let query = supabase
        .from('conversations')
        .select('*')
        .neq('state', 'archived')
        .order('last_message_at', { ascending: false })
        .limit(1)

    if (finalClientId) {
        query = query.eq('client_id', finalClientId)
    } else if (finalLeadId) {
        query = query.eq('lead_id', finalLeadId)
    } else {
        return { success: false, error: 'Failed to resolve contact entity.' }
    }

    const { data: existing } = await query.single()

    if (existing) {
        return { success: true, data: existing }
    }

    // 2. Resolve Organization ID (if not already resolved)
    let organization_id: string | null = resolvedOrgId

    if (!organization_id) {
        if (finalClientId) {
            const { data: client } = await supabase
                .from('leads')
                .select('organization_id')
                .eq('id', finalClientId)
                .single()
            organization_id = client?.organization_id || null
        } else if (finalLeadId) {
            const { data: lead } = await supabase
                .from('leads')
                .select('organization_id')
                .eq('id', finalLeadId)
                .single()
            organization_id = lead?.organization_id || null
        }
    }

    if (!organization_id) {
        return { success: false, error: 'Entity not found or missing organization context' }
    }

    // 3. Create new conversation
    const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
            organization_id: organization_id,
            lead_id: finalLeadId || null,
            client_id: finalClientId || null,
            channel: channel || 'whatsapp',
            connection_id: connection_id || null,
            state: 'active',
            status: 'open',
            unread_count: 0,
            last_message: 'Chat started',
            last_message_at: new Date().toISOString()
        })
        .select()
        .single()

    if (error) {
        console.error("Failed to create conversation:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/inbox')
    return { success: true, data: newConv }
}
