import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
type Row = Record<string, unknown>
const state = vi.hoisted(() => ({
    tables: {} as Record<string, Row[]>, writes: [] as { table: string; method: string; scope: string | null }[],
    filters: [] as { table: string; key: string; value: unknown }[], user: 'user' as string | null,
    org: '', unlocked: true, superAdmin: false, modules: ['module_tasks'], failTable: '', noWriteRow: false, throwModuleError: false,
    calendar: vi.fn(), revalidate: vi.fn(), from: vi.fn(),
}))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { from: state.from } }))
vi.mock('@/modules/core/database/supabase-server', () => ({ createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user ? { id: state.user } : null }, error: null }) }, from: state.from,
}) }))
vi.mock('@/modules/core/organizations/organization-actions', () => ({ getCurrentOrganizationId: async () => state.org }))
vi.mock('@/modules/core/iam/services/platform-roles', () => ({ isSuperAdmin: async () => state.superAdmin }))
vi.mock('@/modules/core/saas/saas-actions', () => ({ getActiveModules: async () => {
    if (state.throwModuleError) throw new Error('private module configuration details')
    return state.modules
} }))
vi.mock('@/modules/features/portal-security/utils/session-cookie', () => ({ isPortalSessionUnlocked: async () => state.unlocked }))
vi.mock('@/modules/features/integrations/google/google-calendar-service', () => ({ deleteGoogleCalendarMeetingEvent: state.calendar }))
vi.mock('next/cache', () => ({ revalidatePath: state.revalidate }))

import { portalUpdateTaskPriority, portalAssignTask, portalDeleteTask, portalBulkDeleteTasks } from './collaborator-portal-actions'
import { deleteTasks } from './task-actions'

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const tenant = uuid(1), otherTenant = uuid(2), staffId = uuid(3), task = uuid(4), otherTask = uuid(5)
const workspace = uuid(6), otherWorkspace = uuid(7), project = uuid(8), otherProject = uuid(9)
const assignee = uuid(10), foreignAssignee = uuid(11), foreignTask = uuid(12), roleId = uuid(13)
const token = 'private-test-token-12345'
const staff = () => state.tables.organization_staff[0]
const member = () => state.tables.organization_members[0]

beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    state.user = 'user'; state.org = tenant; state.unlocked = true; state.superAdmin = false
    state.modules = ['module_tasks']; state.failTable = ''; state.noWriteRow = false
    state.throwModuleError = false
    state.writes = []; state.filters = []
    state.tables = {
        organizations: [{ id: tenant, status: 'active' }, { id: otherTenant, status: 'active' }],
        organization_members: [{ organization_id: tenant, user_id: 'user', role: 'member', role_id: null, status: 'active', permissions: {} }],
        organization_roles: [],
        organization_staff: [
            { id: staffId, organization_id: tenant, user_id: null, role: 'Developer', task_role: 'developer', access_token: token, is_active: true, pin_code: null, can_bulk_delete_tasks: null },
            { id: assignee, organization_id: tenant, is_active: true }, { id: foreignAssignee, organization_id: otherTenant, is_active: true },
        ],
        task_items: [
            { id: task, organization_id: tenant, workspace_id: workspace, project_id: project, type: 'task', external_meeting_id: null },
            { id: otherTask, organization_id: tenant, workspace_id: otherWorkspace, project_id: otherProject, type: 'task', external_meeting_id: null },
            { id: foreignTask, organization_id: otherTenant, workspace_id: null, project_id: null, type: 'task', external_meeting_id: null },
        ],
        task_workspaces: [{ id: workspace, organization_id: tenant, lead_staff_id: 'someone-else' }],
        task_projects: [{ id: project, organization_id: tenant, workspace_id: workspace, lead_staff_id: 'someone-else' },
            { id: otherProject, organization_id: tenant, workspace_id: otherWorkspace, lead_staff_id: 'someone-else' }],
    }
    state.from.mockImplementation((table: string) => {
        const predicates: ((row: Row) => boolean)[] = []
        let method = '', scope: string | null = null
        const result = () => {
            const rows = (state.tables[table] || []).filter(row => predicates.every(test => test(row)))
            if (method) state.writes.push({ table, method, scope })
            return { data: method && state.noWriteRow ? [] : rows, error: state.failTable === table ? { message: 'private db failure' } : null, count: rows.length }
        }
        const query = {
            select: () => query,
            eq: (key: string, value: unknown) => { state.filters.push({ table, key, value }); predicates.push(row => row[key] === value); return query },
            in: (key: string, values: unknown[]) => { predicates.push(row => values.includes(row[key])); return query },
            not: (key: string, _operator: string, value: unknown) => { predicates.push(row => row[key] !== value); return query },
            or: (value: string) => { scope = value; return query },
            update: () => { method = 'update'; return query }, delete: () => { method = 'delete'; return query },
            maybeSingle: async () => { const value = result(); return { ...value, data: value.data[0] || null } },
            single: async () => { const value = result(); return { ...value, data: value.data[0] || null } },
            then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
        }
        return query
    })
})
afterEach(() => vi.restoreAllMocks())
const pm = () => { staff().task_role = 'pm' }
const noSideEffects = () => { expect(state.writes).toHaveLength(0); expect(state.calendar).not.toHaveBeenCalled() }

describe('Tasks mutation server authorization', () => {
    it.each(['priority', 'assign', 'delete', 'bulk'])('denies a regular collaborator before side effects: %s', async action => {
        const result = action === 'priority' ? await portalUpdateTaskPriority(token, task, 'high')
            : action === 'assign' ? await portalAssignTask(token, task, assignee)
                : action === 'delete' ? await portalDeleteTask(token, task) : await portalBulkDeleteTasks(token, [task])
        expect(result.success).toBe(false); noSideEffects()
    })
    it.each(['priority', 'assign', 'delete', 'bulk'])('enforces PIN for a manager: %s', async action => {
        pm(); staff().pin_code = '1234'; state.unlocked = false
        const result = action === 'priority' ? await portalUpdateTaskPriority(token, task, 'high')
            : action === 'assign' ? await portalAssignTask(token, task, assignee)
                : action === 'delete' ? await portalDeleteTask(token, task) : await portalBulkDeleteTasks(token, [task])
        expect(result.success).toBe(false); noSideEffects()
    })
    it.each(['priority', 'assign', 'delete', 'bulk'])('preserves manager operations with an unlocked session: %s', async action => {
        pm(); staff().pin_code = '1234'
        const result = action === 'priority' ? await portalUpdateTaskPriority(token, task, 'high')
            : action === 'assign' ? await portalAssignTask(token, task, assignee)
                : action === 'delete' ? await portalDeleteTask(token, task) : await portalBulkDeleteTasks(token, [task])
        expect(result.success).toBe(true)
        expect(state.writes).toHaveLength(1)
        expect(state.filters).toContainEqual({ table: 'task_items', key: 'organization_id', value: tenant })
    })
    it('accepts token revocation, suspended tenants and module removal as access denial', async () => {
        pm(); staff().is_active = false
        expect((await portalUpdateTaskPriority(token, task, 'high')).success).toBe(false)
        staff().is_active = true; state.tables.organizations[0].status = 'suspended'
        expect((await portalUpdateTaskPriority(token, task, 'high')).success).toBe(false)
        state.tables.organizations[0].status = 'active'; state.modules = []
        expect((await portalUpdateTaskPriority(token, task, 'high')).success).toBe(false)
        noSideEffects()
    })
    it('does not infer manager access from a label overridden by the structured role', async () => {
        staff().role = 'Project Manager'
        expect((await portalUpdateTaskPriority(token, task, 'high')).success).toBe(false); noSideEffects()
    })
    it('allows a workspace lead only on records in that workspace, binding writes to the scope', async () => {
        state.tables.task_workspaces[0].lead_staff_id = staffId
        expect((await portalUpdateTaskPriority(token, task, 'high')).success).toBe(true)
        expect(state.writes[0].scope).toContain(`workspace_id.in.(${workspace})`)
        state.writes = []
        expect((await portalUpdateTaskPriority(token, otherTask, 'high')).success).toBe(false); noSideEffects()
    })
    it('resolves inherited project workspace leadership when the task workspace is null', async () => {
        state.tables.task_items[0].workspace_id = null
        state.tables.task_workspaces[0].lead_staff_id = staffId
        expect((await portalAssignTask(token, task, assignee)).success).toBe(true)
        expect(state.writes[0].scope).toContain(`project_id.in.(${project})`)
    })
    it('permits project leadership only for that project', async () => {
        state.tables.task_projects[0].lead_staff_id = staffId
        expect((await portalDeleteTask(token, task)).success).toBe(true)
        state.writes = []
        expect((await portalDeleteTask(token, otherTask)).success).toBe(false); noSideEffects()
    })
    it('rejects a mixed authorized/unauthorized bulk selection before any deletion', async () => {
        state.tables.task_projects[0].lead_staff_id = staffId
        expect((await portalBulkDeleteTasks(token, [task, otherTask])).success).toBe(false); noSideEffects()
    })
    it('preserves explicit bulk permission without granting assignment or single-delete privileges', async () => {
        staff().can_bulk_delete_tasks = true
        expect((await portalAssignTask(token, task, assignee)).success).toBe(false)
        expect((await portalDeleteTask(token, task)).success).toBe(false); noSideEffects()
        expect(await portalBulkDeleteTasks(token, [task, otherTask])).toMatchObject({ success: true, count: 2 })
    })
    it('preserves explicit bulk denial even for a manager, without changing single-delete access', async () => {
        pm(); staff().can_bulk_delete_tasks = false
        expect((await portalBulkDeleteTasks(token, [task])).success).toBe(false); noSideEffects()
        expect((await portalDeleteTask(token, task)).success).toBe(true)
    })
    it('rejects foreign tasks and foreign or inactive assignees', async () => {
        pm()
        expect((await portalUpdateTaskPriority(token, foreignTask, 'high')).success).toBe(false)
        expect((await portalAssignTask(token, task, foreignAssignee)).success).toBe(false)
        state.tables.organization_staff[1].is_active = false
        expect((await portalAssignTask(token, task, assignee)).success).toBe(false); noSideEffects()
    })
    it('does not acknowledge an update when no scoped record remains writable', async () => {
        pm(); state.noWriteRow = true
        expect((await portalUpdateTaskPriority(token, task, 'high')).success).toBe(false)
    })
    it('hides database details when role/record checks fail', async () => {
        pm(); state.failTable = 'task_items'
        const result = await portalUpdateTaskPriority(token, task, 'high')
        expect(result.success).toBe(false); expect(JSON.stringify(result)).not.toContain('private db'); noSideEffects()
    })
    it('hides unexpected module errors for portal and dashboard callers', async () => {
        pm(); member().role = 'owner'; state.throwModuleError = true
        for (const result of [await portalUpdateTaskPriority(token, task, 'high'), await deleteTasks([task])]) {
            expect(result.success).toBe(false)
            expect(JSON.stringify(result)).not.toContain('private module')
        }
        noSideEffects()
    })
    it('rejects malformed priorities, identifiers and duplicate bulk IDs safely', async () => {
        pm()
        expect((await portalUpdateTaskPriority(token, task, '__proto__' as 'high')).success).toBe(false)
        expect((await portalAssignTask(token, 'invalid', null)).success).toBe(false); noSideEffects()
        expect(await portalBulkDeleteTasks(token, [task, task])).toMatchObject({ success: true, count: 1 })
    })
    it('keeps meeting cancellation behind all permission checks', async () => {
        state.tables.task_items[0].type = 'meeting'; state.tables.task_items[0].external_meeting_id = 'meeting'
        expect((await portalDeleteTask(token, task)).success).toBe(false); noSideEffects()
        pm(); expect((await portalDeleteTask(token, task)).success).toBe(true)
        expect(state.calendar).toHaveBeenCalledWith(expect.objectContaining({ orgId: tenant, staffId }))
    })
    it('denies dashboard bulk deletion without a canonical management grant', async () => {
        expect((await deleteTasks([task])).success).toBe(false); noSideEffects()
    })
    it.each(['owner', 'override', 'role', 'superadmin'])('preserves a valid dashboard management grant: %s', async grant => {
        if (grant === 'owner') member().role = 'owner'
        if (grant === 'override') member().permissions = { 'operations.tasks.manage': true }
        if (grant === 'role') {
            member().role_id = roleId
            state.tables.organization_roles = [{ id: roleId, organization_id: tenant, hierarchy_level: 10, permissions: { 'operations.tasks.manage': true } }]
        }
        if (grant === 'superadmin') state.superAdmin = true
        expect(await deleteTasks([task])).toMatchObject({ success: true, count: 1 })
    })
    it('never borrows another active tenant or a foreign role grant for dashboard deletion', async () => {
        member().permissions = { 'operations.tasks.manage': true }
        state.tables.organization_members.push({ organization_id: otherTenant, user_id: 'user', role: 'member', status: 'active', permissions: {} })
        expect((await deleteTasks([foreignTask], otherTenant)).success).toBe(false); noSideEffects()
        member().permissions = {}; member().role_id = roleId
        state.tables.organization_roles = [{ id: roleId, organization_id: otherTenant, hierarchy_level: 100, permissions: { all: true } }]
        expect((await deleteTasks([task])).success).toBe(false); noSideEffects()
    })
    it('rejects blocked and unauthenticated dashboard callers before any side effect', async () => {
        member().role = 'owner'; member().status = 'blocked'
        expect((await deleteTasks([task])).success).toBe(false)
        member().status = 'active'; state.user = null
        expect((await deleteTasks([task])).success).toBe(false); noSideEffects()
    })
})
