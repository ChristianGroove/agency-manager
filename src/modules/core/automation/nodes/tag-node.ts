
import { ContextManager } from '../context-manager';
import { addLeadTagSystem, removeLeadTagSystem } from '@/modules/core/crm/tags-actions';

export interface TagNodeData {
    action: 'add' | 'remove';
    tagName: string;
    leadId?: string;
}

export class TagNode {
    constructor(private contextManager: ContextManager) { }

    async execute(data: TagNodeData): Promise<{ success: boolean; error?: string }> {
        try {
            const action = data.action || 'add';
            const tagName = this.contextManager.resolve(data.tagName || '');
            let leadId = this.contextManager.resolve(data.leadId || '');

            // Fallback to Context Lead ID if not specified
            if (!leadId) {
                const contextLead = this.contextManager.get('lead') as any;
                leadId = contextLead?.id;
            }

            if (!leadId) {
                return { success: false, error: 'Lead ID required' };
            }

            if (!tagName) {
                return { success: false, error: 'Tag Name required' };
            }

            const organizationId = this.contextManager.get('organization_id') as string;
            if (!organizationId) {
                return { success: false, error: 'Organization Context missing' };
            }

            console.log(`[TagNode] ${action.toUpperCase()} Tag '${tagName}' for Lead ${leadId}`);

            if (action === 'add') {
                const res = await addLeadTagSystem(leadId, tagName, organizationId);
                if (!res.success) throw new Error(res.error);
            } else if (action === 'remove') {
                const res = await removeLeadTagSystem(leadId, tagName, organizationId);
                if (!res.success) throw new Error(res.error);
            }

            return { success: true };

        } catch (error: any) {
            console.error('[TagNode] Error:', error);
            return { success: false, error: error.message };
        }
    }
}
