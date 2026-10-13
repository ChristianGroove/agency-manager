import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ from: vi.fn(), eq: vi.fn(), workspace: [] as { id: string }[], project: [] as { id: string }[], error: false }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { from: mocks.from } }))
import { resolveTaskPortalRoleContext } from './portal-role-context'

beforeEach(() => {
    vi.clearAllMocks(); mocks.workspace = []; mocks.project = []; mocks.error = false
    mocks.from.mockImplementation(table => {
        const query = { select: () => query, eq: (key: string, value: string) => { mocks.eq(table, key, value); return query },
            limit: async () => ({ data: table === 'task_workspaces' ? mocks.workspace : mocks.project, error: mocks.error ? { message: 'lookup failed' } : null }) }
        return query
    })
})
const staff = { id: 'staff', organization_id: 'tenant', role: 'Developer' }

it('scopes both role lookups to the verified collaborator and tenant', async () => {
    expect(await resolveTaskPortalRoleContext(staff)).toMatchObject({ verified: true, isLeadOrPm: false, isQa: false, portalMode: 'operations', canBulkDeleteTasks: false })
    for (const table of ['task_workspaces', 'task_projects']) {
        expect(mocks.eq).toHaveBeenCalledWith(table, 'organization_id', 'tenant')
        expect(mocks.eq).toHaveBeenCalledWith(table, 'lead_staff_id', 'staff')
    }
})

it('preserves lead-by-assignment and QA coexistence from the portal UI', async () => {
    mocks.workspace = [{ id: 'workspace' }]
    expect(await resolveTaskPortalRoleContext({ ...staff, role: 'QA Tester' })).toMatchObject({ isLeadOrPm: true, isQa: true, leadWorkspaces: mocks.workspace, canBulkDeleteTasks: true })
})

it('preserves PM defaults and explicit bulk-delete denial', async () => {
    expect(await resolveTaskPortalRoleContext({ ...staff, role: 'Project Manager', can_bulk_delete_tasks: false })).toMatchObject({ isLeadOrPm: true, canBulkDeleteTasks: false })
})

it('uses the support variant only when the collaborator is not a lead', async () => {
    expect(await resolveTaskPortalRoleContext({ ...staff, task_role: 'support' })).toMatchObject({ portalMode: 'support' })
    mocks.project = [{ id: 'project' }]
    expect(await resolveTaskPortalRoleContext({ ...staff, task_role: 'support' })).toMatchObject({ portalMode: 'operations', isLeadOrPm: true })
})

it('reports uncertain lookup results so help can fail closed without changing legacy UI defaults', async () => {
    mocks.error = true
    expect(await resolveTaskPortalRoleContext({ ...staff, role: 'Project Manager' })).toMatchObject({ verified: false, isLeadOrPm: true })
})

it('honors structured management roles and their precedence over free-text labels', async () => {
    expect(await resolveTaskPortalRoleContext({ ...staff, task_role: 'pm' })).toMatchObject({ isLeadOrPm: true })
    expect(await resolveTaskPortalRoleContext({ ...staff, role: 'Project Manager', task_role: 'developer' })).toMatchObject({ isLeadOrPm: false })
})
