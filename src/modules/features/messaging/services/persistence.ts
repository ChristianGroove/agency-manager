import { supabaseAdmin } from "@/modules/core/database/supabase-admin"

/**
 * Atomic Persistence Layer for Messaging
 * Breaking circular dependencies by isolating DB operations.
 */
export class MessagingPersistence {
    /**
     * Save an outbound message sent by an agent or system.
     */
    static async saveOutboundMessage(params: {
        conversationId: string,
        content: any,
        externalId?: string | null,
        messageId?: string | null, // Added for compatibility
        sender: string,
        id?: string,
        channel?: string
    }) {
        const { 
            conversationId, 
            content, 
            externalId, 
            messageId, 
            sender, 
            id, 
            channel = 'whatsapp' 
        } = params
        
        // Use externalId or messageId
        const finalExternalId = externalId || messageId || null;
        
        const supabase = supabaseAdmin

        const { error } = await supabase.from('messages').insert({
            id: id,
            conversation_id: conversationId,
            direction: 'outbound',
            channel: channel,
            content: typeof content === 'string' ? { type: 'text', text: content } : content,
            status: 'sent',
            external_id: finalExternalId,
            sender: sender,
            metadata: {
                sender_type: sender === 'System' ? 'bot' : 'human'
            }
        })

        if (error) {
            console.error('[MessagingPersistence] Failed to save outbound message:', error)
            throw error
        }

        console.log(`[MessagingPersistence] Outbound message saved for convo ${conversationId}`)
        return { success: true }
    }

    /**
     * Check if a conversation has an active 24h session window (Meta policies)
     */
    static async hasActiveSessionWindow(conversationId: string): Promise<boolean> {
        const { data: lastInbound, error } = await supabaseAdmin
            .from('messages')
            .select('created_at')
            .eq('conversation_id', conversationId)
            .eq('direction', 'inbound')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !lastInbound) return false;

        const lastMessageDate = new Date(lastInbound.created_at);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        return lastMessageDate > twentyFourHoursAgo;
    }
}
