"use server"

import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { revalidatePath } from "next/cache"
import { getDictionary, Locale } from "@/modules/core/i18n/dictionaries"
import { resolveLanguage } from "@/modules/core/i18n"

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

    // 1. Fetch the conversation first so every following check is scoped to its organization.
    const convResult = await supabaseAdmin
        .from('conversations')
        .select('organization_id, channel, connection_id, assigned_to')
        .eq('id', conversationId)
        .single()
    const conv = convResult.data

    if (!conv) return { success: false, error: "Conversation not found" }

    const [agentResult, memberResult, sourceMemberResult] = await Promise.all([
        supabaseAdmin
            .from('agent_availability')
            .select('*')
            .eq('organization_id', conv.organization_id)
            .eq('agent_id', toAgentId)
            .single(),
        supabaseAdmin
            .from('organization_members')
            .select('role')
            .eq('organization_id', conv.organization_id)
            .eq('user_id', toAgentId)
            .single(),
        fromAgentId
            ? supabaseAdmin
                .from('organization_members')
                .select('role')
                .eq('organization_id', conv.organization_id)
                .eq('user_id', fromAgentId)
                .single()
            : Promise.resolve({ data: null, error: null }),
    ])

    const agent = agentResult.data
    const member = memberResult.data
    const sourceMember = sourceMemberResult.data

    if (fromAgentId && !sourceMember) return { success: false, error: "Transfer source is not a member of this organization" }
    if (!member || !agent) return { success: false, error: "Target agent profile or member record not found" }

    // 2. VALIDATION: Status & Capacity
    if (agent.status === 'offline') return { success: false, error: "Target agent is offline" }
    if (agent.current_load >= agent.max_capacity) return { success: false, error: "Target agent is at maximum capacity" }

    // 3. VALIDATION: Channel Access (with Admin Bypass)
    const isAdmin = ['admin', 'owner'].includes(member.role?.toLowerCase())
    if (!isAdmin) {
        const channelBindings = Array.from(new Set(
            [conv.channel, conv.connection_id].filter((value): value is string => typeof value === 'string' && value.length > 0)
        ))

        const { data: hasAccess } = await supabaseAdmin
            .from('agent_channels')
            .select('agent_id')
            .eq('organization_id', conv.organization_id)
            .eq('agent_id', toAgentId)
            .in('channel_type', channelBindings)
            .eq('is_active', true)
            .limit(1)

        if (!hasAccess || hasAccess.length === 0) {
            return { success: false, error: "Target agent does not have access to this channel" }
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
        .eq('organization_id', conv.organization_id)

    if (updateError) {
        console.error("[TransferService] Update failed:", updateError)
        return { success: false, error: updateError.message }
    }

    // 6. LOG SYSTEM MESSAGE (Surgical optimization)
    const locale = await resolveLanguage() as Locale
    const dict = getDictionary(locale)
    const t = dict.crm.inbox.chat.system

    // Fetch names in parallel for both agents ONLY from profiles (FAST)
    const userIds = [toAgentId]
    if (fromAgentId) userIds.push(fromAgentId)

    const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    const getAgentName = (id: string | null) => {
        if (!id) return "System"
        const p = profileMap.get(id)
        return p?.full_name || "Agent"
    }

    const fromName = getAgentName(fromAgentId)
    const toName = getAgentName(toAgentId)

    const reasonSuffix = reason ? t.transfer_reason.replace('{reason}', reason) : ''
    const systemText = t.transferred
        .replace('{from}', fromName)
        .replace('{to}', toName)
        .replace('{reason}', reasonSuffix)

    await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        organization_id: conv.organization_id,
        direction: 'outbound',
        channel: conv.channel,
        content: { type: 'system', text: systemText },
        sender: 'System',
        metadata: { transfer: true, fromAgentId, toAgentId, reason }
    })

    // 7. Update loads (Handling is done by DB triggers ideally, but we double check or trigger revalidation)
    revalidatePath('/inbox')
    revalidatePath('/crm/inbox')

    return { success: true }
}
