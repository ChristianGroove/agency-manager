import 'server-only'
import { z } from 'zod'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { isPortalSessionUnlocked } from '@/modules/features/portal-security/utils/session-cookie'
import { getActiveModules } from '@/modules/core/saas/saas-actions'
import { resolveTaskPortalRoleContext } from '@/modules/features/tasks/services/portal-role-context'
import { resolveCollaboratorCapabilities, type CollaboratorRole } from '@/modules/features/tasks/types'
import { tasksPortalHelpEnabled } from './activation'
import type { HelpAccess } from './schema'
import { TASK_PORTAL_CAPABILITIES, type TaskPortalProfile } from './scope'

const tokenSchema = z.string().min(16).max(200).regex(/^[a-zA-Z0-9_-]+$/)
const staffSchema = z.object({
    id: z.string().uuid(), organization_id: z.string().uuid(), is_active: z.literal(true),
    pin_code: z.string().nullable(), role: z.string().nullable(), task_role: z.string().nullable().optional(),
    can_bulk_delete_tasks: z.boolean().nullable().optional(),
    settings: z.unknown().optional(),
})
const organizationSchema = z.object({
    id: z.string().uuid(), status: z.literal('active'), active_app_id: z.string().min(1).max(100).nullable(),
    rate_limit_config: z.object({ ai_mode: z.enum(['byok', 'saas', 'disabled']).optional(), ai_status: z.enum(['active', 'suspended']).optional() }).nullable(),
})
const verticalSchema = z.enum(['agency', 'resto', 'cleaning', 'platform', 'retail', 'saas', 'real_estate'])

export interface TasksPortalHelpSession {
    tenantId: string
    staffId: string
    access: HelpAccess & { surface: 'portal.tasks'; portalProfiles: TaskPortalProfile[] }
    capabilities: { isLeadOrPm: boolean; isQa: boolean; canBulkDeleteTasks: boolean; portalMode: 'operations' | 'support' }
}

/** Server-only resolver: never accepts tenant, roles, capabilities or scope from the browser. */
export async function resolveTasksPortalHelpSession(token: unknown): Promise<TasksPortalHelpSession | null> {
    if (process.env.PIXY_HELP_TASKS_PORTAL_ENABLED !== 'true') return null
    const input = tokenSchema.safeParse(token)
    if (!input.success) return null
    try {
        const staffResult = await supabaseAdmin.from('organization_staff')
            .select('id, organization_id, is_active, pin_code, role, task_role, can_bulk_delete_tasks, settings')
            .eq('access_token', input.data).eq('is_active', true).maybeSingle()
        if (staffResult.error) return null
        const parsed = staffSchema.safeParse(staffResult.data)
        if (!parsed.success) return null
        const staff = parsed.data
        if (!tasksPortalHelpEnabled(staff.organization_id)) return null
        if (staff.pin_code && !await isPortalSessionUnlocked(input.data, staff.id)) return null

        const organizationResult = await supabaseAdmin.from('organizations')
            .select('id, status, active_app_id, rate_limit_config').eq('id', staff.organization_id).maybeSingle()
        if (organizationResult.error) return null
        const org = organizationSchema.safeParse(organizationResult.data)
        if (!org.success || org.data.id !== staff.organization_id || org.data.rate_limit_config?.ai_mode === 'disabled'
            || org.data.rate_limit_config?.ai_status === 'suspended') return null

        const modules = await getActiveModules(staff.organization_id)
        if (!modules.includes('module_tasks') && !modules.includes('all')) return null
        const context = await resolveTaskPortalRoleContext(staff)
        if (!context.verified) return null
        const profiles: TaskPortalProfile[] = context.portalMode === 'support' ? ['support']
            : context.isLeadOrPm ? context.isQa ? ['lead', 'qa'] : ['lead'] : context.isQa ? ['qa'] : ['collaborator']
        const technical = resolveCollaboratorCapabilities({ role: staff.role || '', task_role: (staff.task_role || undefined) as CollaboratorRole | undefined, settings: staff.settings })
        const portalCapabilities = TASK_PORTAL_CAPABILITIES.filter(capability => capability === 'bulk_delete'
            ? context.canBulkDeleteTasks : technical[capability] === true)

        let vertical = 'unknown'
        if (org.data.active_app_id) {
            const app = await supabaseAdmin.from('saas_apps').select('space_category').eq('id', org.data.active_app_id).maybeSingle()
            const category = verticalSchema.safeParse(app.data?.space_category)
            if (!app.error && category.success) vertical = category.data
        }
        return {
            tenantId: staff.organization_id, staffId: staff.id,
            capabilities: { isLeadOrPm: context.isLeadOrPm, isQa: context.isQa, canBulkDeleteTasks: context.canBulkDeleteTasks, portalMode: context.portalMode },
            access: { surface: 'portal.tasks', portalProfiles: profiles, portalCapabilities, platformAdmin: false, tenantAdmin: false,
                modules: ['module_tasks'], permissions: [], vertical, route: '/portal/tasks/[token]' },
        }
    } catch {
        // Missing/invalid/revoked access and backend failures reveal no token or staff details.
        return null
    }
}
