import { supabaseAdmin } from "@/modules/core/database/supabase-admin";
import { MESSAGING_STORAGE_BUCKET } from "./constants";

export class MessagingCleanupService {
    /**
     * Identifies and deletes all physical media files associated with a conversation
     */
    async deleteConversationMedia(conversationId: string) {
        const supabase = supabaseAdmin;

        // 1. Fetch all messages with media
        const { data: messages, error } = await supabase
            .from('messages')
            .select('content, metadata')
            .eq('conversation_id', conversationId);

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
            console.log(`[MessagingCleanup] Deleting ${pathsToDelete.length} files from storage for conversation ${conversationId}`);
            const { error: storageError } = await supabase.storage
                .from(MESSAGING_STORAGE_BUCKET)
                .remove(pathsToDelete);

            if (storageError) {
                console.error(`[MessagingCleanup] Failed to delete files from storage:`, storageError);
            }
        }
    }

    /**
     * Cleans up media for multiple leads
     */
    async deleteLeadsMedia(leadIds: string[]) {
        const supabase = supabaseAdmin;

        // Find all conversations for these leads
        const { data: conversations } = await supabase
            .from('conversations')
            .select('id')
            .in('lead_id', leadIds);

        if (!conversations || conversations.length === 0) return;

        for (const conv of conversations) {
            await this.deleteConversationMedia(conv.id);
        }
    }
}

export const messagingCleanupService = new MessagingCleanupService();
