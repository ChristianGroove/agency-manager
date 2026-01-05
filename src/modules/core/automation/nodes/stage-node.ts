
import { ContextManager } from '../context-manager';
import { updateLeadStatusSystem } from '@/modules/core/crm/leads-actions';

export interface StageNodeData {
    status: string;
    leadId?: string;
}

export class StageNode {
    constructor(private contextManager: ContextManager) { }

    async execute(data: StageNodeData): Promise<{ success: boolean; error?: string }> {
        try {
            const status = this.contextManager.resolve(data.status || '');
            let leadId = this.contextManager.resolve(data.leadId || '');

            // Fallback to Context Lead ID
            if (!leadId) {
                const contextLead = this.contextManager.get('lead') as any;
                leadId = contextLead?.id;
            }

            if (!leadId) {
                return { success: false, error: 'Lead ID required' };
            }

            if (!status) {
                return { success: false, error: 'Status/Stage required' };
            }

            const organizationId = this.contextManager.get('organization_id') as string;
            // Org ID optional for updateLeadStatusSystem but good for safety

            console.log(`[StageNode] Updating Lead ${leadId} status to '${status}'`);

            const res = await updateLeadStatusSystem(leadId, status, organizationId);

            if (!res.success) throw new Error(res.error);

            // Update context with new status?
            if (this.contextManager.get('lead')) {
                const lead = this.contextManager.get('lead') as any;
                lead.status = status;
                // We'd need to setDeep or replace object. 
                // ContextManager.set usually replaces.
                this.contextManager.set('lead', { ...lead, status });
            }

            return { success: true };

        } catch (error: any) {
            console.error('[StageNode] Error:', error);
            return { success: false, error: error.message };
        }
    }
}
