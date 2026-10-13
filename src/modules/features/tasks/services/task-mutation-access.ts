import 'server-only'
import { z } from 'zod'
import { createClient } from '@/modules/core/database/supabase-server'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { isSuperAdmin } from '@/modules/core/iam/services/platform-roles'
import { getActiveModules } from '@/modules/core/saas/saas-actions'
import { isPortalSessionUnlocked } from '@/modules/features/portal-security/utils/session-cookie'
import { isStaffLeadOrPmRole } from '../types'

const idSchema = z.string().uuid()
const tokenSchema = z.string().min(16).max(200).regex(/^[a-zA-Z0-9_-]+$/)
const idsSchema = z.array(idSchema).min(1).max(1000)
const denied = 'No tienes autorización para realizar esta acción.'
const unavailable = 'No se pudo comprobar el acceso a las tareas. Intenta nuevamente.'
class TaskMutationAccessError extends Error {}
const permission = 'operations.tasks.manage'
const permissions = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

async function requireActiveTasks(organizationId: string) {
    const { data, error } = await supabaseAdmin.from('organizations').select('status').eq('id', organizationId).maybeSingle()
    if (error) throw new TaskMutationAccessError(unavailable)
    if (data?.status !== 'active') throw new TaskMutationAccessError(denied)
    const modules = await getActiveModules(organizationId)
    if (!modules.includes('module_tasks') && !modules.includes('all')) throw new TaskMutationAccessError(denied)
}

/** Scope IAM lookup to the target tenant, never to an unrelated active-tenant permission cache. */
async function checkDashboardTaskManagement(organizationId: string) {
    if (!idSchema.safeParse(organizationId).success) throw new TaskMutationAccessError(denied)
    const client = await createClient()
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) throw new TaskMutationAccessError(denied)
    await requireActiveTasks(organizationId)
    if (await isSuperAdmin(user.id)) return
    const { data: member, error } = await client.from('organization_members')
        .select('role,role_id,status,permissions').eq('organization_id', organizationId).eq('user_id', user.id).maybeSingle()
    if (error) throw new TaskMutationAccessError(unavailable)
    if (!member || member.status !== 'active') throw new TaskMutationAccessError(denied)
    // Preserve canonical IAM owner/wildcard semantics, while rejecting foreign role rows.
    if (member.role === 'owner') return
    let rolePermissions: Record<string, unknown> = {}
    let ownerRole = false
    if (member.role_id) {
        const role = await client.from('organization_roles').select('permissions,hierarchy_level')
            .eq('id', member.role_id).eq('organization_id', organizationId).maybeSingle()
        if (role.error || !role.data) throw new TaskMutationAccessError(unavailable)
        rolePermissions = permissions(role.data.permissions)
        ownerRole = role.data.hierarchy_level === 100
    }
    const overrides = permissions(member.permissions)
    if (!ownerRole && rolePermissions.all !== true && overrides.all !== true
        && rolePermissions[permission] !== true && overrides[permission] !== true) throw new TaskMutationAccessError(denied)
}

export async function requireDashboardTaskManagement(organizationId: string) {
    try { await checkDashboardTaskManagement(organizationId) }
    catch (error) { throw new TaskMutationAccessError(error instanceof TaskMutationAccessError ? error.message : unavailable) }
}

interface PortalMutationStaff {
    id: string; organization_id: string; user_id: string | null; role: string | null; task_role: string | null
    pin_code: string | null; can_bulk_delete_tasks: boolean | null
}
interface MutationTask {
    id: string; project_id: string | null; type: string; external_meeting_id: string | null
}
export interface PortalTaskMutationAccess {
    staff: PortalMutationStaff
    tasks: MutationTask[]
    allTasks: boolean
    projectIds: string[]
}

/** Token/PIN and tenant checks precede record access. Assignment leadership never grants tenant-wide management. */
async function checkPortalTaskMutation(token: unknown, taskIds: string[], operation: 'manage' | 'delete' | 'bulk-delete'): Promise<PortalTaskMutationAccess> {
    if (!tokenSchema.safeParse(token).success || !idsSchema.safeParse(taskIds).success) throw new TaskMutationAccessError(denied)
    const { data, error } = await supabaseAdmin.from('organization_staff')
        .select('id,organization_id,user_id,role,task_role,pin_code,can_bulk_delete_tasks')
        .eq('access_token', token).eq('is_active', true).maybeSingle()
    if (error) throw new TaskMutationAccessError(unavailable)
    if (!data) throw new TaskMutationAccessError(denied)
    const staff = data as PortalMutationStaff
    if (staff.pin_code && !await isPortalSessionUnlocked(token as string, staff.id)) throw new TaskMutationAccessError(denied)
    await requireActiveTasks(staff.organization_id)
    const globalManager = isStaffLeadOrPmRole(staff.role, staff.task_role)
    const bulkSetting = staff.can_bulk_delete_tasks
    if (operation === 'bulk-delete' && bulkSetting === false) throw new TaskMutationAccessError(denied)
    const allTasks = globalManager || (operation === 'bulk-delete' && bulkSetting === true)
    const tasks: MutationTask[] = []
    const ids = [...new Set(taskIds)]
    for (let offset = 0; offset < ids.length; offset += 100) {
        const batch = await supabaseAdmin.from('task_items').select('id,project_id,type,external_meeting_id')
            .eq('organization_id', staff.organization_id).in('id', ids.slice(offset, offset + 100))
        if (batch.error) throw new TaskMutationAccessError(unavailable)
        tasks.push(...(batch.data || []) as MutationTask[])
    }
    if (tasks.length !== ids.length || tasks.some(task => !ids.includes(task.id))) throw new TaskMutationAccessError(denied)
    let workspaceIds: string[] = [], projectIds: string[] = []
    if (!allTasks) {
        const relevantProjects = [...new Set(tasks.flatMap(task => task.project_id ? [task.project_id] : []))]
        const projects = relevantProjects.length ? await supabaseAdmin.from('task_projects')
            .select('id,workspace_id,lead_staff_id').eq('organization_id', staff.organization_id).in('id', relevantProjects)
            : { data: [], error: null }
        if (projects.error) throw new TaskMutationAccessError(unavailable)
        // Tasks inherit their workspace through task_projects; task_items has no workspace_id.
        const relevantWorkspaces = [...new Set((projects.data || []).flatMap(project => project.workspace_id ? [project.workspace_id] : []))]
        const workspaces = relevantWorkspaces.length ? await supabaseAdmin.from('task_workspaces').select('id')
            .eq('organization_id', staff.organization_id).eq('lead_staff_id', staff.id).in('id', relevantWorkspaces)
            : { data: [], error: null }
        if (workspaces.error) throw new TaskMutationAccessError(unavailable)
        workspaceIds = (workspaces.data || []).map(workspace => workspace.id)
        projectIds = (projects.data || []).filter(project => project.lead_staff_id === staff.id
            || workspaceIds.includes(project.workspace_id)).map(project => project.id)
        if (tasks.some(task => !projectIds.includes(task.project_id || ''))) throw new TaskMutationAccessError(denied)
    }
    return { staff, tasks, allTasks, projectIds }
}

export async function requirePortalTaskMutation(token: unknown, taskIds: string[], operation: 'manage' | 'delete' | 'bulk-delete'): Promise<PortalTaskMutationAccess> {
    try { return await checkPortalTaskMutation(token, taskIds, operation) }
    catch (error) { throw new TaskMutationAccessError(error instanceof TaskMutationAccessError ? error.message : unavailable) }
}

/** Repeat record-scope filters on writes in case a task moved after the authorization lookup. */
export function portalTaskMutationFilter(access: PortalTaskMutationAccess): string | null {
    if (access.allTasks) return null
    if (!access.projectIds.length) throw new TaskMutationAccessError(denied)
    return `project_id.in.(${access.projectIds.join(',')})`
}

export function validateTaskMutationIds(ids: unknown): string[] {
    const parsed = idsSchema.safeParse(ids)
    if (!parsed.success) throw new Error('Selecciona entre 1 y 1000 tareas válidas.')
    return [...new Set(parsed.data)]
}
