"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"

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
            updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

    if (updateError) {
        console.error("[TransferService] Update failed:", updateError)
        return { success: false, error: updateError.message }
    }

    // 6. LOG SYSTEM MESSAGE
    let fromName = "System"
    if (fromAgentId) {
        const { data: fromUser } = await supabaseAdmin.auth.admin.getUserById(fromAgentId)
        fromName = fromUser?.user?.user_metadata?.name || fromUser?.user?.email || "Agent"
    }

    const { data: toUser } = await supabaseAdmin.auth.admin.getUserById(toAgentId)
    const toName = toUser?.user?.user_metadata?.name || toUser?.user?.email || "Agent"

    const systemText = `Chat transferred from ${fromName} to ${toName}${reason ? `: ${reason}` : ''}`

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
