import { MESSAGING_STORAGE_BUCKET } from "./constants";
import { createClient } from "@/modules/core/database/supabase-server";

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeCleanupError(error: unknown) {
    if (error instanceof Error) {
        return { name: error.name }
    }

    if (error && typeof error === 'object') {
        return {
            type: 'object',
            code: (error as { code?: unknown }).code,
            statusCode: (error as { statusCode?: unknown }).statusCode,
            hasMessage: typeof (error as { message?: unknown }).message === 'string',
        }
    }

    return { type: typeof error }
}

function sanitizeCleanupLogDetails(details: Record<string, unknown> = {}) {
    return Object.fromEntries(
        Object.entries(details).map(([key, value]) => {
            if (key === 'conversationId') {
                return ['conversationIdPresent', Boolean(value)]
            }

            if (key === 'pathsToDelete' && Array.isArray(value)) {
                return ['pathsToDeleteCount', value.length]
            }

            return [key, value]
        })
    )
}

function logCleanupInfo(label: string, details: Record<string, unknown> = {}) {
    console.log(label, sanitizeCleanupLogDetails(details))
}

function logCleanupError(label: string, error: unknown, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        console.error(label, error, details)
        return
    }

    console.error(label, {
        ...sanitizeCleanupLogDetails(details),
        detail: summarizeCleanupError(error),
    })
}

export class MessagingCleanupService {
    /**
     * Identifies and deletes all physical media files associated with a conversation
     */
    async deleteConversationMedia(conversationId: string, organizationId?: string) {
        const supabase = (await createClient());

        // 1. Fetch all messages with media
        let query = supabase
            .from('messages')
            .select('content, metadata')
            .eq('conversation_id', conversationId);

        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }

        const { data: messages, error } = await query;

        if (error || !messages) return;

        // 2. Extract storage paths
        const pathsToDelete: string[] = [];
        const bucketMatch = `/${MESSAGING_STORAGE_BUCKET}/`;

        for (const msg of messages) {
            const content = msg.content as any;
            const url = content?.url || content?.mediaUrl || content?.link || msg.metadata?.mediaUrl;

            if (url && url.includes(bucketMatch)) {
                // Extract path after bucket name
                const parts = url.split(bucketMatch);
                if (parts.length > 1) {
                    // Remove potential query params (signatures)
                    const filePath = parts[1].split('?')[0];
                    pathsToDelete.push(decodeURIComponent(filePath));
                }
            }
        }

        // 3. Perform storage deletion
        if (pathsToDelete.length > 0) {
            logCleanupInfo('[MessagingCleanup] Deleting files from storage', { conversationId, pathsToDelete });
            const { error: storageError } = await supabase.storage
                .from(MESSAGING_STORAGE_BUCKET)
                .remove(pathsToDelete);

            if (storageError) {
                logCleanupError('[MessagingCleanup] Failed to delete files from storage', storageError, { conversationId, pathsToDelete });
            }
        }
    }

    /**
     * Cleans up media for multiple leads
     */
    async deleteLeadsMedia(leadIds: string[], organizationId?: string) {
        const supabase = (await createClient());

        // Find all conversations for these leads
        let query = supabase
            .from('conversations')
            .select('id')
            .in('lead_id', leadIds);

        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }

        const { data: conversations } = await query;

        if (!conversations || conversations.length === 0) return;

        for (const conv of conversations) {
            await this.deleteConversationMedia(conv.id, organizationId);
        }
    }
}

export const messagingCleanupService = new MessagingCleanupService();
