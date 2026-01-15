
import { ContextManager } from '../context-manager';
import { NodeExecutionResult } from '../types';

export interface NotificationNodeData {
    actionType: 'notify_user' | 'notify_email';
    userId?: string; // Target user (admin/staff)
    title: string;
    message: string;
    link?: string;
    email?: string; // For notify_email
}

export class NotificationNode {
    constructor(private contextManager: ContextManager) { }

    async execute(data: NotificationNodeData): Promise<NodeExecutionResult> {
        const actionType = data.actionType || 'notify_user';

        const title = this.contextManager.resolve(data.title || 'Notification');
        const message = this.contextManager.resolve(data.message || '');
        const link = this.contextManager.resolve(data.link || '');
        const organizationId = this.contextManager.get('organization_id') as string;

        // Default to current user or a specific admin if variable provided
        // If data.userId is provided, resolve it. 
        // If not, maybe we notify the owner of the lead?
        // For now, let's require userId or default to current context user if available
        let userId = this.contextManager.resolve(data.userId || '');
        if (!userId) {
            userId = (this.contextManager.get('user') as any)?.id;
        }

        if (!userId && actionType === 'notify_user') {
            // Fallback: Notify all admins? Too risky. 
            // We'll log warning and fail.
            throw new Error("Target User ID required for internal notification");
        }

        if (actionType === 'notify_user') {
            const { supabaseAdmin } = await import('@/lib/supabase-admin');

            await supabaseAdmin.from('notifications').insert({
                organization_id: organizationId,
                user_id: userId,
                type: 'system_alert',
                title,
                message,
                action_url: link,
                read: false
            });

            console.log(`[NotificationNode] Sent internal alert to ${userId}`);
        }
        else if (actionType === 'notify_email') {
            // TODO: Implement internal email sending via Resend/SMTP
            console.warn("[NotificationNode] Email notification not yet implemented provider-side");
        }

        return { success: true };
    }
}
