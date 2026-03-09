
import { ContextManager } from '../context-manager';
import { NodeExecutionResult } from '../types';

export interface ConversationNodeData {
    actionType: 'deactivate_bot' | 'resolve_conversation' | 'set_unread';
    conversationId?: string;
}

export class ConversationNode {
    constructor(private contextManager: ContextManager) { }

    async execute(data: ConversationNodeData): Promise<NodeExecutionResult> {
        const { supabaseAdmin } = await import('@/lib/supabase-admin');
        const { fileLogger } = await import('@/lib/file-logger');

        const executionId = this.contextManager.get('executionId') as string;
        const orgId = this.contextManager.get('organization_id') as string;

        const logToDb = async (level: string, message: string, details?: any) => {
            if (!executionId || !orgId) return;
            await supabaseAdmin.from('workflow_logs').insert({
                organization_id: orgId,
                execution_id: executionId,
                node_id: 'conversation-node-internal',
                level,
                message,
                details,
                created_at: new Date().toISOString()
            });
        };

        fileLogger.log(`[ConversationNode] --- Starting Node Execution ---`);
        await logToDb('info', 'Entering Conversation Node');

        // SURGICAL: Wait 1.5s to ensure any pending database triggers from preceding message nodes 
        // (like update_conversation_last_message) have finished their asynchronous updates.
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            // 1. Resolve Conversation ID
            let conversationId = this.contextManager.resolve(data.conversationId || '');

            if (!conversationId) {
                conversationId = (
                    this.contextManager.get('conversation.id') ||
                    this.contextManager.get('conversationId') ||
                    (this.contextManager.get('message') as any)?.conversationId
                ) as string;
            }

            if (!conversationId) {
                console.error(`[ConversationNode] ❌ No conversation ID found in context`);
                return { success: false, error: 'No conversation ID found' };
            }

            const action = data.actionType;
            console.error(`[ConversationNode] 🚀 Preparing ${action} for ${conversationId}`);

            // Fetch latest metadata to avoid stale overrides
            const { data: latestConv } = await supabaseAdmin
                .from('conversations')
                .select('metadata, is_bot_active, status, lead_id')
                .eq('id', conversationId)
                .single();

            const updates: any = {
                updated_at: new Date().toISOString()
            };

            if (action === 'deactivate_bot') {
                updates.is_bot_active = false;
                updates.waiting_since = new Date().toISOString();
                // Workaround for trigger override: temporarily mark as human sender in metadata
                updates.metadata = {
                    ...(latestConv?.metadata || {}),
                    sender_type: 'human',
                    deactivated_by: 'automation'
                };
            } else if (action === 'resolve_conversation' || (action as string) === 'resolve_and_clear_tags') {
                updates.status = 'closed';
                updates.is_bot_active = false;
                updates.waiting_since = null;
                updates.metadata = {
                    ...(latestConv?.metadata || {}),
                    resolved_at: new Date().toISOString(),
                    resolved_by: 'automation'
                };

                // CLEAR TAGS if requested
                if ((action as string) === 'resolve_and_clear_tags' && latestConv?.lead_id) {
                    await logToDb('info', 'Clearing lead tags as part of resolution', { leadId: latestConv.lead_id });
                    await supabaseAdmin
                        .from('crm_lead_tags')
                        .delete()
                        .eq('lead_id', latestConv.lead_id);

                    // Also clear denormalized tags on conversation
                    updates.tags = [];
                }
            }

            const { error, data: updatedData } = await supabaseAdmin
                .from('conversations')
                .update(updates)
                .eq('id', conversationId)
                .select();

            if (error) {
                console.error(`[ConversationNode] ❌ Update Error:`, error);
                await logToDb('error', `Update failed: ${error.message}`, error);
                throw error;
            }

            console.error(`[ConversationNode] ✅ Successfully executed ${action} for ${conversationId}. Updated metadata:`, updatedData?.[0]?.metadata);
            await logToDb('info', `Executed ${action}`, { conversationId, updates });

            // Wait 500ms and check again to see if a trigger changed it back
            await new Promise(resolve => setTimeout(resolve, 500));
            const { data: verify } = await supabaseAdmin
                .from('conversations')
                .select('is_bot_active, metadata, status')
                .eq('id', conversationId)
                .single();

            console.error(`[ConversationNode] 🕵️ Verification after 500ms: is_bot_active=${verify?.is_bot_active}, sender_type=${verify?.metadata?.sender_type}`);
            await logToDb('info', `Post-execution verify`, { is_bot_active: verify?.is_bot_active, sender_type: verify?.metadata?.sender_type, status: verify?.status });

            return { success: true };
        } catch (error: any) {
            console.error(`[ConversationNode] ❌ Critical Error:`, error);
            fileLogger.log(`[ConversationNode] Error: ${error.message}`);
            await logToDb('error', `Critical Error: ${error.message}`, error);
            return { success: false, error: error.message };
        }
    }
}
