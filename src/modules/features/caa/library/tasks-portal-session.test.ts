import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ from: vi.fn(), pin: vi.fn(), modules: vi.fn(), roles: vi.fn(), staff: {} as Record<string, unknown>, org: {} as Record<string, unknown>, error: false, eq: vi.fn(), select: vi.fn() }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { from: mocks.from } }))
vi.mock('@/modules/features/portal-security/utils/session-cookie', () => ({ isPortalSessionUnlocked: mocks.pin }))
vi.mock('@/modules/core/saas/saas-actions', () => ({ getActiveModules: mocks.modules }))
vi.mock('@/modules/features/tasks/services/portal-role-context', () => ({ resolveTaskPortalRoleContext: mocks.roles }))
import { resolveTasksPortalHelpSession } from './tasks-portal-session'

const orgId = '00000000-0000-4000-8000-000000000001'
const staffId = '00000000-0000-4000-8000-000000000002'
const token = '00000000-0000-4000-8000-000000000003'
beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('PIXY_HELP_TASKS_PORTAL_ENABLED', 'true'); vi.stubEnv('PIXY_HELP_TASKS_PORTAL_TENANTS', orgId)
    mocks.staff = { id: staffId, organization_id: orgId, is_active: true, pin_code: 'pin-secret', role: 'Developer', task_role: 'developer' }
    mocks.org = { id: orgId, status: 'active', active_app_id: null, rate_limit_config: null }
    mocks.error = false
    mocks.pin.mockResolvedValue(true); mocks.modules.mockResolvedValue(['module_tasks', 'module_invoicing'])
    mocks.roles.mockResolvedValue({ verified: true, isLeadOrPm: false, isQa: false, canBulkDeleteTasks: false, portalMode: 'operations' })
    mocks.from.mockImplementation(table => {
        const query = { select: (columns: string) => { mocks.select(table, columns); return query },
            eq: (key: string, value: unknown) => { mocks.eq(table, key, value); return query },
            maybeSingle: async () => ({ data: table === 'organization_staff' ? mocks.staff : mocks.org, error: mocks.error ? { message: 'secret DB details' } : null }) }
        return query
    })
})
afterEach(() => vi.unstubAllEnvs())

it('derives a scoped identity without token, PIN, personal fields or dashboard privilege', async () => {
    const session = await resolveTasksPortalHelpSession(token)
    expect(session).toMatchObject({ tenantId: orgId, staffId, access: { surface: 'portal.tasks', platformAdmin: false, tenantAdmin: false, modules: ['module_tasks'], permissions: [], portalProfiles: ['collaborator'] } })
    expect(JSON.stringify(session)).not.toContain(token)
    expect(JSON.stringify(session)).not.toContain('pin-secret')
    expect(mocks.eq).toHaveBeenCalledWith('organization_staff', 'access_token', token)
    expect(mocks.eq).toHaveBeenCalledWith('organization_staff', 'is_active', true)
    expect(mocks.eq).toHaveBeenCalledWith('organizations', 'id', orgId)
    expect(mocks.modules).toHaveBeenCalledWith(orgId)
    expect(mocks.select.mock.calls.some(call => /first_name|email|photo|\*/.test(call[1]))).toBe(false)
})

it('is disabled by default without querying collaborators', async () => {
    vi.stubEnv('PIXY_HELP_TASKS_PORTAL_ENABLED', '')
    expect(await resolveTasksPortalHelpSession(token)).toBeNull()
    expect(mocks.from).not.toHaveBeenCalled()
})

it('accepts existing text application identifiers and derives explicit capability overrides', async () => {
    mocks.org.active_app_id = 'app_saas_platform'
    mocks.staff.settings = { capabilities: { vcs_code: false, finance_costs: true } }
    const session = await resolveTasksPortalHelpSession(token)
    expect(session).not.toBeNull()
    expect(session?.access.portalCapabilities).toContain('finance_costs')
    expect(session?.access.portalCapabilities).not.toContain('vcs_code')
    expect(session?.access.portalCapabilities).not.toContain('bulk_delete')
})

it('requires explicit tenant targeting, never wildcard or caller-selected tenant', async () => {
    vi.stubEnv('PIXY_HELP_TASKS_PORTAL_TENANTS', '*')
    expect(await resolveTasksPortalHelpSession(token)).toBeNull()
    expect(mocks.pin).not.toHaveBeenCalled()
    expect(mocks.modules).not.toHaveBeenCalled()
    expect(await resolveTasksPortalHelpSession({ token, tenantId: orgId, surface: 'dashboard' })).toBeNull()
})

it.each([null, undefined, 'short', 'secret?token=1234567890'])('rejects malformed tokens before database access: %s', async input => {
    expect(await resolveTasksPortalHelpSession(input)).toBeNull()
    expect(mocks.from).not.toHaveBeenCalled()
})

it('rejects revoked/missing/inactive collaborators and backend lookup failures', async () => {
    mocks.staff = null as unknown as Record<string, unknown>
    expect(await resolveTasksPortalHelpSession(token)).toBeNull()
    mocks.staff = { id: staffId, organization_id: orgId, is_active: false, pin_code: null, role: 'owner' }
    expect(await resolveTasksPortalHelpSession(token)).toBeNull()
    mocks.error = true
    expect(await resolveTasksPortalHelpSession(token)).toBeNull()
})

it('rejects locked PIN sessions and does not resolve organizational or role context', async () => {
    mocks.pin.mockResolvedValue(false)
    expect(await resolveTasksPortalHelpSession(token)).toBeNull()
    expect(mocks.pin).toHaveBeenCalledWith(token, staffId)
    expect(mocks.modules).not.toHaveBeenCalled(); expect(mocks.roles).not.toHaveBeenCalled()
})

it('permits a valid portal without PIN but fails closed if PIN metadata is missing', async () => {
    mocks.staff.pin_code = null
    expect(await resolveTasksPortalHelpSession(token)).not.toBeNull()
    expect(mocks.pin).not.toHaveBeenCalled()
    delete mocks.staff.pin_code
    expect(await resolveTasksPortalHelpSession(token)).toBeNull()
})

it.each([{ status: 'suspended' }, { rate_limit_config: { ai_mode: 'disabled' } }, { rate_limit_config: { ai_status: 'suspended' } }, { id: staffId }])('rejects unavailable or mismatched tenants: %j', async patch => {
    Object.assign(mocks.org, patch)
    expect(await resolveTasksPortalHelpSession(token)).toBeNull()
    expect(mocks.roles).not.toHaveBeenCalled()
})

it('rejects missing Tasks module or unverified role lookups', async () => {
    mocks.modules.mockResolvedValue(['module_invoicing'])
    expect(await resolveTasksPortalHelpSession(token)).toBeNull()
    mocks.modules.mockResolvedValue(['module_tasks']); mocks.roles.mockResolvedValue({ verified: false })
    expect(await resolveTasksPortalHelpSession(token)).toBeNull()
})

it('uses server-derived profiles without promoting a lead to tenant admin', async () => {
    mocks.roles.mockResolvedValue({ verified: true, isLeadOrPm: true, isQa: true, canBulkDeleteTasks: true, portalMode: 'operations' })
    expect((await resolveTasksPortalHelpSession(token))?.access).toMatchObject({ portalProfiles: ['lead', 'qa'], tenantAdmin: false })
    mocks.roles.mockResolvedValue({ verified: true, isLeadOrPm: false, isQa: false, canBulkDeleteTasks: false, portalMode: 'support' })
    expect((await resolveTasksPortalHelpSession(token))?.access.portalProfiles).toEqual(['support'])
})
