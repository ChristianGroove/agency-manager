import 'server-only'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { inferTaskRole, isStaffLeadOrPmRole } from '../types'

interface PortalStaffRoleInput {
    id: string
    organization_id: string
    role?: string | null
    task_role?: string | null
    can_bulk_delete_tasks?: boolean | null
}

/** Shared UI role context. This describes portal capabilities, not authorization to mutate a record. */
export async function resolveTaskPortalRoleContext(staff: PortalStaffRoleInput) {
    const [workspaces, projects] = await Promise.all([
        supabaseAdmin.from('task_workspaces').select('id').eq('organization_id', staff.organization_id).eq('lead_staff_id', staff.id).limit(1),
        supabaseAdmin.from('task_projects').select('id').eq('organization_id', staff.organization_id).eq('lead_staff_id', staff.id).limit(1),
    ])
    const isLeadOrPm = Boolean(isStaffLeadOrPmRole(staff.role, staff.task_role) || workspaces.data?.length || projects.data?.length)
    const role = (staff.role || '').toLowerCase()
    const isQa = ['qa', 'tester', 'calidad', 'revisor', 'pruebas'].some(keyword => role.includes(keyword))
    const isSupport = (staff.task_role || inferTaskRole(staff.role)) === 'support' && !isLeadOrPm
    return {
        verified: !workspaces.error && !projects.error && Array.isArray(workspaces.data) && Array.isArray(projects.data),
        isLeadOrPm, isQa, portalMode: isSupport ? 'support' as const : 'operations' as const,
        leadWorkspaces: workspaces.data || [],
        canBulkDeleteTasks: staff.can_bulk_delete_tasks !== null && staff.can_bulk_delete_tasks !== undefined
            ? Boolean(staff.can_bulk_delete_tasks) : isLeadOrPm,
    }
}
