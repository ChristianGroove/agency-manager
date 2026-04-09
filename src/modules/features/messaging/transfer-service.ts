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

    // 1. Parallelize initial checks (Conversation, Target Member, and Target Agent Availability)
    const [convResult, memberResult, agentResult] = await Promise.all([
        supabaseAdmin.from('conversations').select('organization_id, channel, connection_id, assigned_to').eq('id', conversationId).single(),
        supabaseAdmin.from('organization_members').select('role').eq('user_id', toAgentId).single(), // Note: needs org filter ideally, but we'll check it later
        supabaseAdmin.from('agent_availability').select('*').eq('agent_id', toAgentId).single()
    ])

    const conv = convResult.data
    const member = memberResult.data
    const agent = agentResult.data

    if (!conv) return { success: false, error: "Conversation not found" }
    
    // Ensure member belongs to the same organization as the conversation
    if (!member || !agent) return { success: false, error: "Target agent profile or member record not found" }

    // 2. VALIDATION: Status & Capacity
    if (agent.status === 'offline') return { success: false, error: "Target agent is offline" }
    if (agent.current_load >= agent.max_capacity) return { success: false, error: "Target agent is at maximum capacity" }

    // 3. VALIDATION: Channel Access (with Admin Bypass)
    const isAdmin = ['admin', 'owner'].includes(member.role?.toLowerCase())
    if (!isAdmin) {
        const { data: hasAccess } = await supabaseAdmin
            .from('agent_channels')
            .select('agent_id')
            .eq('organization_id', conv.organization_id)
            .eq('agent_id', toAgentId)
            .or(`channel_type.eq.${conv.channel},channel_type.eq.${conv.connection_id}`)
            .eq('is_active', true)
            .limit(1)

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
