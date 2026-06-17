"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"
import { messagingCleanupService } from "./cleanup-service"

const PUBLIC_CONVERSATION_ACTION_ERROR = "Conversation action failed"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
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
    if (error instanceof Error) {
        return { name: error.name }
    }

    if (error && typeof error === 'object') {
        return {
            type: 'object',
            code: (error as { code?: unknown }).code,
            hasMessage: typeof (error as { message?: unknown }).message === 'string',
        }
    }

    return { type: typeof error }
}

function logConversationActionError(label: string, error: unknown, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        if (Object.keys(details).length > 0) console.error(label, error, details)
        else console.error(label, error)
        return
    }

    console.error(label, {
        ...sanitizeConversationActionLogDetails(details),
        detail: summarizeConversationActionError(error),
    })
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

import { container } from "@/modules/core/di/container"
import { ConversationService } from "./services/conversation.service"

/**
 * Returns the active integration_connection IDs for the current org.
 * Used by GlobalMessageListener to filter cross-tenant message popups.
 */
export async function getOrgConnectionIds(): Promise<string[]> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    const service = new ConversationService(supabase, orgId);
    return service.getOrgConnectionIds();
}


/**
 * Archive a conversation
 */
export async function archiveConversation(conversationId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No organization" }

    const service = new ConversationService(supabase, orgId)
    const result = await service.archiveConversation(conversationId)
    revalidatePath('/messaging')
    return result
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
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No organization" }

    const service = new ConversationService(supabase, orgId)
    const result = await service.deleteConversation(conversationId, deleteLeadIfOrphaned)
    revalidatePath('/messaging')
    return result
}

/**
 * Mark conversation as read
 */
export async function markAsRead(conversationId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No organization" }

    const service = new ConversationService(supabase, orgId)
    const result = await service.markAsRead(conversationId)
    revalidatePath('/messaging')
    return result
}

/**
 * Unarchive a conversation
 */
export async function unarchiveConversation(conversationId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No organization" }

    const service = new ConversationService(supabase, orgId)
    const result = await service.unarchiveConversation(conversationId)
    revalidatePath('/messaging')
    return result
}

/**
 * Snooze a conversation
 */
export async function snoozeConversation(conversationId: string, until: Date) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No organization" }

    const service = new ConversationService(supabase, orgId)
    const result = await service.snoozeConversation(conversationId, until)
    revalidatePath('/messaging')
    return result
}

/**
 * Get the last few messages for a lead's most recent conversation
 */
export async function getLeadConversationPreview(leadId: string, limit: number = 3) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No organization" }

    const service = new ConversationService(supabase, orgId)
    const result = await service.getLeadConversationPreview(leadId, limit)
    revalidatePath('/messaging')
    return result
}

/**
 * Resolve and close a conversation (Optimized)
 */
export async function completeConversation(conversationId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No organization" }

    const service = new ConversationService(supabase, orgId)
    const result = await service.completeConversation(conversationId)
    revalidatePath('/messaging')
    return result
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

