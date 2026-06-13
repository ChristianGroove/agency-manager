import { createClient } from "@/modules/core/database/supabase-server";

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV
}

function sanitizePersistenceLogDetails(details: Record<string, unknown> = {}) {
    const sensitiveKeys = new Set([
        'conversationId',
        'externalId',
        'id',
        'messageId',
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

function summarizePersistenceError(error: unknown) {
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

function logPersistenceInfo(label: string, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        console.log(label, details)
        return
    }

    console.log(label, sanitizePersistenceLogDetails(details))
}

function logPersistenceError(label: string, error: unknown, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        console.error(label, error, details)
        return
    }

    console.error(label, {
        ...sanitizePersistenceLogDetails(details),
        detail: summarizePersistenceError(error),
    })
}

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
        channel?: string,
        organizationId?: string | null
    }) {
        const { 
            conversationId, 
            content, 
            externalId, 
            messageId, 
            sender, 
            id, 
            channel = 'whatsapp',
            organizationId,
        } = params
        
        // Use externalId or messageId
        const finalExternalId = externalId || messageId || null;
        
        const supabase = (await createClient())

        const payload: Record<string, unknown> = {
            id: id || messageId || undefined, // Use provided ID to match optimistic UI
            conversation_id: conversationId,
            ...(organizationId ? { organization_id: organizationId } : {}),
            direction: 'outbound',
            channel: channel,
            content: typeof content === 'string' ? { type: 'text', text: content } : content,
            status: 'sent',
            external_id: finalExternalId,
            sender: sender,
            metadata: {
                sender_type: sender === 'System' ? 'bot' : 'human'
            }
        }

        const { error } = await supabase.from('messages').insert(payload)

        if (error) {
            logPersistenceError('[MessagingPersistence] Failed to save outbound message:', error, {
                conversationId,
                externalId: finalExternalId,
                id,
                messageId,
            })
            throw error
        }

        logPersistenceInfo('[MessagingPersistence] Outbound message saved', { conversationId })
        return { success: true }
    }

    /**
     * Check if a conversation has an active 24h session window (Meta policies)
     */
    static async hasActiveSessionWindow(conversationId: string): Promise<boolean> {
        const { data: lastInbound, error } = await (await createClient())
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
