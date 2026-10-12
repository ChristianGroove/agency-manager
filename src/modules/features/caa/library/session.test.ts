import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveHelpAccess } from './session'
import type { HelpArticle } from './schema'

const mocks = vi.hoisted(() => ({ client: vi.fn(), admin: vi.fn(), permission: vi.fn(), modules: vi.fn(), vertical: vi.fn(), membership: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/modules/core/database/supabase-server', () => ({ createClient: mocks.client }))
vi.mock('@/modules/core/iam/services/platform-roles', () => ({ isSuperAdmin: mocks.admin }))
vi.mock('@/modules/core/iam/services/role-service', () => ({ hasPermission: mocks.permission }))
vi.mock('@/modules/core/saas/saas-actions', () => ({ getActiveModules: mocks.modules }))
vi.mock('@/modules/core/organizations/space-helpers', () => ({ getOrgSpaceCategory: mocks.vertical }))

const articles = [{ audience: 'tenant-user', routes: ['/dashboard'], required_permissions: ['org.settings.manage'] },
    { audience: 'platform-admin', routes: ['/platform/admin'], required_permissions: [] }] as HelpArticle[]
beforeEach(() => {
    vi.clearAllMocks()
    const builder = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: mocks.membership }
    mocks.client.mockResolvedValue({ from: vi.fn(() => builder) })
    mocks.membership.mockResolvedValue({ data: { role: 'member', status: 'active' }, error: null })
    mocks.admin.mockResolvedValue(false); mocks.modules.mockResolvedValue(['core_settings']); mocks.vertical.mockResolvedValue('agency')
    mocks.permission.mockResolvedValue(false)
})
describe('help context server authorization', () => {
    it('does not accept a client route as platform authorization', async () => {
        const result = await resolveHelpAccess('org', 'user', articles, '/platform/admin')
        expect(result.platformAdmin).toBe(false); expect(result.route).toBeNull(); expect(result.permissions).toEqual([])
    })
    it('does not elevate a blocked admin membership', async () => {
        mocks.membership.mockResolvedValue({ data: { role: 'admin', status: 'blocked' }, error: null })
        mocks.permission.mockResolvedValue(true)
        const result = await resolveHelpAccess('org', 'user', articles, '/dashboard')
        expect(result.tenantAdmin).toBe(false); expect(result.permissions).toEqual([]); expect(mocks.permission).not.toHaveBeenCalled()
    })
    it('uses IAM decisions rather than editorial audience for granular access', async () => {
        mocks.membership.mockResolvedValue({ data: { role: 'admin', status: 'active' }, error: null })
        const result = await resolveHelpAccess('org', 'user', articles, '/dashboard')
        expect(result.tenantAdmin).toBe(true); expect(result.permissions).toEqual([])
        expect(mocks.permission).toHaveBeenCalledWith('org.settings.manage')
    })
})
