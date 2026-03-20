"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { getDictionary, Locale } from "@/lib/i18n/dictionaries"
import { resolveLanguage } from "@/lib/i18n"

export interface TransferResult {
    success: boolean
    error?: string
}

/**
 * Service to handle conversation transfers between agents with strict validation
 */
export async function transferConversation(
    conversationId: string,
    fromAgentId: string | null,
    toAgentId: string,
    reason?: string
): Promise<TransferResult> {
    console.log(`[TransferService] 🚀 Attempting transfer: Conv ${conversationId} from ${fromAgentId} to ${toAgentId}`)

    // 1. Get conversation and agent data
    const { data: conv } = await supabaseAdmin
        .from('conversations')
        .select('organization_id, channel, connection_id, assigned_to')
        .eq('id', conversationId)
        .single()

    if (!conv) return { success: false, error: "Conversation not found" }

    // Get target agent data AND role
    const { data: member } = await supabaseAdmin
        .from('organization_members')
        .select('role')
        .eq('organization_id', conv.organization_id)
        .eq('user_id', toAgentId)
        .single()

    const { data: agent } = await supabaseAdmin
        .from('agent_availability')
        .select('*')
        .eq('organization_id', conv.organization_id)
        .eq('agent_id', toAgentId)
        .single()

    if (!member || !agent) return { success: false, error: "Target agent profile or member record not found" }

    // 2. VALIDATION: Status
    if (agent.status === 'offline') {
        return { success: false, error: "Target agent is offline" }
    }

    // 3. VALIDATION: Capacity
    if (agent.current_load >= agent.max_capacity) {
        return { success: false, error: "Target agent is at maximum capacity" }
    }

    // 4. VALIDATION: Channel Access (with Admin Bypass)
    const isAdmin = ['admin', 'owner'].includes(member.role?.toLowerCase())

    if (!isAdmin) {
        // Check if agent has access to specific connection OR channel type slug
        const { data: hasAccess } = await supabaseAdmin
            .from('agent_channels')
            .select('agent_id')
            .eq('organization_id', conv.organization_id)
            .eq('agent_id', toAgentId)
            .or(`channel_type.eq.${conv.channel},channel_type.eq.${conv.connection_id}`)
            .eq('is_active', true)
            .limit(1)

        if (!hasAccess || hasAccess.length === 0) {
            // Note: We ALLOW the transfer now because SidebarConversationList favors explicit assignment.
            // This allows "Individual Chat Grants" without giving access to the whole channel.
            console.log(`[TransferService] ℹ️ Granting individual access to ${toAgentId} for channel ${conv.channel} via assignment`);
        }
    }

    // 5. EXECUTE TRANSFER
    const { error: updateError } = await supabaseAdmin
        .from('conversations')
        .update({
            assigned_to: toAgentId,
            is_bot_active: false, // Ensure bot mode is cleared on handover
            updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

    if (updateError) {
        console.error("[TransferService] Update failed:", updateError)
        return { success: false, error: updateError.message }
    }

    // 6. LOG SYSTEM MESSAGE
    const locale = await resolveLanguage() as Locale
    const dict = getDictionary(locale)
    const t = dict.crm.inbox.chat.system

    const userIds = [toAgentId]
    if (fromAgentId) userIds.push(fromAgentId)

    const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    let fromName = "System"
    if (fromAgentId) {
        const p = profileMap.get(fromAgentId)
        if (p?.full_name) {
            fromName = p.full_name
        } else {
            const { data: userData } = await supabaseAdmin.auth.admin.getUserById(fromAgentId)
            fromName = userData?.user?.user_metadata?.name || userData?.user?.email || "Agent"
        }
    }

    let toName = "Agent"
    const pTo = profileMap.get(toAgentId)
    if (pTo?.full_name) {
        toName = pTo.full_name
    } else {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(toAgentId)
        toName = userData?.user?.user_metadata?.name || userData?.user?.email || "Agent"
    }

    const reasonSuffix = reason ? t.transfer_reason.replace('{reason}', reason) : ''
    const systemText = t.transferred
        .replace('{from}', fromName)
        .replace('{to}', toName)
        .replace('{reason}', reasonSuffix)

    await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        direction: 'outbound',
        channel: conv.channel,
        content: { type: 'system', text: systemText },
        sender: 'System',
        metadata: { transfer: true, fromAgentId, toAgentId, reason }
    })

    // 7. Update loads (Handling is done by DB triggers ideally, but we double check or trigger revalidation)
    revalidatePath('/inbox')
    revalidatePath('/crm/inbox')

    console.log(`[TransferService] ✅ Transfer completed successfully`)
    return { success: true }
}
