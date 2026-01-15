/**
 * CRM Node Handler
 * Enables workflows to interact with the CRM module
 */

import { createLead, createLeadSystem, updateLeadStatus } from '@/modules/core/crm/leads-actions';
import { ContextManager } from '../context-manager';

export interface CRMNodeData {
    actionType: 'create_lead' | 'update_stage' | 'add_tag';

    // For create_lead
    leadName?: string;          // Supports {{variable}} interpolation
    leadEmail?: string;
    leadPhone?: string;
    leadCompany?: string;
    leadNotes?: string;
    pipelineStageId?: string;

    // For update_stage
    leadId?: string;            // Can use {{context.leadId}}
    newStageId?: string;

    // For add_tag
    tagName?: string;
}

export class CRMNode {
    constructor(private contextManager: ContextManager) { }

    async execute(data: CRMNodeData): Promise<void> {
        console.log('[CRM Node] Executing:', data.actionType);

        switch (data.actionType) {
            case 'create_lead':
                await this.createLead(data);
                break;
            case 'update_stage':
                await this.updateStage(data);
                break;
            case 'add_tag':
                await this.addTag(data);
                break;
            default:
                console.warn('[CRM Node] Unknown action type:', data.actionType);
        }
    }

    private async createLead(data: CRMNodeData): Promise<void> {
        // Resolve variables from context
        const name = this.contextManager.resolve(data.leadName || '');
        const email = this.contextManager.resolve(data.leadEmail || '');
        const phone = this.contextManager.resolve(data.leadPhone || '');
        const company = this.contextManager.resolve(data.leadCompany || '');
        const notes = this.contextManager.resolve(data.leadNotes || '');

        // Check for System Context (Automation background run)
        const organizationId = this.contextManager.get('organization_id') as string | undefined;

        console.log('[CRM Node] Creating lead:', { name, email, phone, company, organizationId });

        let result;

        if (organizationId) {
            console.log('[CRM Node] Using System Action (Background)');
            result = await createLeadSystem({
                name,
                email: email || undefined,
                phone: phone || undefined,
                company_name: company || undefined,
            }, organizationId);
        } else {
            console.log('[CRM Node] Using User Action (Foreground)');
            result = await createLead({
                name,
                email: email || undefined,
                phone: phone || undefined,
                company_name: company || undefined,
            });
        }

        if (result.success && result.data) {
            // Store lead ID in context for future nodes
            console.log('[CRM Node] Lead created successfully:', result.data.id);
            this.contextManager.set('leadId', result.data.id);
            this.contextManager.set('lead', result.data);
        } else {
            console.error('[CRM Node] Failed to create lead:', result.error);
            throw new Error(`Failed to create lead: ${result.error}`);
        }
    }

    private async updateStage(data: CRMNodeData): Promise<void> {
        const leadId = this.contextManager.resolve(data.leadId || '');
        const newStageId = this.contextManager.resolve(data.newStageId || '');

        if (!leadId || !newStageId) {
            console.error('[CRM Node] Missing leadId or newStageId');
            throw new Error('Lead ID and Stage ID are required for update_stage action');
        }

        console.log('[CRM Node] Updating lead stage:', { leadId, newStageId });

        const result = await updateLeadStatus(leadId, newStageId);

        if (result.success) {
            console.log('[CRM Node] Lead stage updated successfully');
        } else {
            console.error('[CRM Node] Failed to update stage:', result.error);
            throw new Error(`Failed to update stage: ${result.error}`);
        }
    }

    private async addTag(data: CRMNodeData): Promise<void> {
        const leadId = this.contextManager.resolve(data.leadId || '');
        const tagName = this.contextManager.resolve(data.tagName || '');

        if (!leadId || !tagName) {
            console.error('[CRM Node] Missing leadId or tagName');
            throw new Error('Lead ID and Tag Name are required for add_tag action');
        }

        const organizationId = this.contextManager.get('organization_id') as string;
        if (!organizationId) {
            throw new Error('[CRM Node] Organization Context missing');
        }

        console.log('[CRM Node] Adding tag to lead:', { leadId, tagName });

        // Dynamic import to avoid circular dependencies if any, or just standard usage
        const { addLeadTagSystem } = await import('@/modules/core/crm/tags-actions');

        const result = await addLeadTagSystem(leadId, tagName, organizationId);

        if (result.success) {
            console.log('[CRM Node] Tag added successfully');
        } else {
            console.error('[CRM Node] Failed to add tag:', result.error);
            // We don't throw error here to avoid stopping workflow if tag already exists or minor issue? 
            // Ideally we should throw if it's critical. Let's throw to be safe on "100% operative".
            throw new Error(`Failed to add tag: ${result.error}`);
        }
    }
}
