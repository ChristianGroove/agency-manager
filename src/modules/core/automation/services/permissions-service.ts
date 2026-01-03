'use server';

/**
 * Workflow Permissions Service
 * 
 * Manages access control for individual workflows.
 */

import { createClient } from '@/lib/supabase-server';
import { getCurrentOrganizationId } from '@/modules/core/organizations/actions';

export type WorkflowRole = 'viewer' | 'editor' | 'approver' | 'admin';

export interface WorkflowPermission {
    id: string;
    workflow_id: string;
    user_id: string;
    role: WorkflowRole;
    user?: {
        email: string;
        full_name: string;
        avatar_url: string;
    };
}

/**
 * Get permissions for a workflow
 */
export async function getWorkflowPermissions(workflowId: string): Promise<WorkflowPermission[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('workflow_permissions')
        .select(`
            *,
            user:user_id (
                email,
                raw_user_meta_data
            )
        `)
        .eq('workflow_id', workflowId);

    if (error) {
        console.error('[Permissions] Failed to get permissions:', error);
        return [];
    }

    return data.map((p: any) => ({
        id: p.id,
        workflow_id: p.workflow_id,
        user_id: p.user_id,
        role: p.role,
        user: {
            email: p.user?.email,
            full_name: p.user?.raw_user_meta_data?.full_name,
            avatar_url: p.user?.raw_user_meta_data?.avatar_url
        }
    }));
}

/**
 * Grant or update permission for a user
 */
export async function setWorkflowPermission(
    workflowId: string,
    userId: string,
    role: WorkflowRole
): Promise<boolean> {
    const supabase = await createClient();
    const organizationId = await getCurrentOrganizationId();

    if (!organizationId) return false;

    // Check if user has permission to manage permissions (admin/owner)
    // For now we rely on RLS, but explicit check is better for UX

    const { error } = await supabase
        .from('workflow_permissions')
        .upsert({
            organization_id: organizationId,
            workflow_id: workflowId,
            user_id: userId,
            role,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'workflow_id,user_id'
        });

    if (error) {
        console.error('[Permissions] Failed to set permission:', error);
        return false;
    }

    return true;
}

/**
 * Remove permission for a user
 */
export async function removeWorkflowPermission(workflowId: string, userId: string): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('workflow_permissions')
        .delete()
        .eq('workflow_id', workflowId)
        .eq('user_id', userId);

    if (error) {
        console.error('[Permissions] Failed to remove permission:', error);
        return false;
    }

    return true;
}

/**
 * Check if current user has required role
 */
export async function checkPermission(workflowId: string, requiredRole: WorkflowRole): Promise<boolean> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
        .rpc('check_workflow_permission', {
            p_workflow_id: workflowId,
            p_user_id: user.id,
            p_required_role: requiredRole
        });

    if (error) {
        console.error('[Permissions] Failed to check permission:', error);
        return false;
    }

    return !!data;
}
