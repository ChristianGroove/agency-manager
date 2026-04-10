import { ContextManager } from '../context-manager';
import { addContactTagSystemAction } from '@/modules/features/crm/crm-actions';

export interface TagNodeData {
    action: 'add' | 'remove';
    tagName: string;
    leadId?: string;
}

export class TagNode {
    constructor(private contextManager: ContextManager) { }

    async execute(data: TagNodeData): Promise<{ success: boolean; error?: string }> {
        const { supabaseAdmin } = await import('@/modules/core/database/supabase-admin');
        const executionId = this.contextManager.get('executionId') as string;
        const orgId = this.contextManager.get('organization_id') as string || this.contextManager.get('organizationId') as string;

        const logToDb = async (level: string, message: string, details?: any) => {
            if (!executionId || !orgId) return;
            await supabaseAdmin.from('workflow_logs').insert({
                organization_id: orgId,
                execution_id: executionId,
                node_id: 'tag-node-internal',
                level,
                message,
                details,
                created_at: new Date().toISOString()
            });
        };

        try {
            const action = data.action || 'add';
            const tagName = this.contextManager.resolve(data.tagName || '');
            let leadId = this.contextManager.resolve(data.leadId || '');

            // Fallback to Context Lead ID if not specified
            if (!leadId) {
                const contextLead = this.contextManager.get('lead') as any;
                leadId = contextLead?.id || this.contextManager.get('leadId') as string || this.contextManager.get('id') as string;
            }

            if (!leadId) {
                console.error('[TagNode] ❌ Lead ID required');
                await logToDb('error', 'Missing Lead ID', { action, tagName });
                return { success: false, error: 'Lead ID required' };
            }

            if (!tagName) {
                console.error('[TagNode] ❌ Tag Name required');
                await logToDb('error', 'Missing Tag Name', { leadId });
                return { success: false, error: 'Tag Name required' };
            }

            if (!orgId) {
                console.error('[TagNode] ❌ Organization Context missing');
                return { success: false, error: 'Organization Context missing' };
            }

            console.log(`[TagNode] 🚀 ${action.toUpperCase()} Tag '${tagName}' for Lead ${leadId}`);
            await logToDb('info', `Executing node: ${action} tag ${tagName}`, { leadId, tagName, action });

            if (action === 'add') {
                const res = await addContactTagSystemAction(leadId, tagName, orgId);
                if (!res.success) throw new Error(res.error);
                await logToDb('info', `Tag added successfully`, { leadId, tagName });
            } else if (action === 'remove') {
                // For removal, we'll use a generic toggle or add a specific remove action if needed.
                // For now, let's treat it as a TODO or use toggle.
                const { toggleLeadTagAction } = await import('@/modules/features/crm/crm-actions');
                const res = await toggleLeadTagAction(leadId, tagName); // Note: tagName might need ID resolution
                if (!res.success) throw new Error(res.error);
                await logToDb('info', `Tag removed successfully`, { leadId, tagName });
            }

            return { success: true };

        } catch (error: any) {
            console.error('[TagNode] ❌ Critical Error:', error);
            await logToDb('error', `Execution failed: ${error.message}`, error);
            return { success: false, error: error.message };
        }
    }
}
