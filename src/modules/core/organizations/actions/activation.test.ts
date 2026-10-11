import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ client: vi.fn(), from: vi.fn(), superAdmin: vi.fn(), currentOrg: vi.fn(), memberships: vi.fn(), send: vi.fn() }))
vi.mock('@/modules/core/database/supabase-server', () => ({ createClient: mocks.client }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { from: mocks.from } }))
vi.mock('@/modules/core/iam/services/platform-roles', () => ({ isSuperAdmin: mocks.superAdmin }))
vi.mock('./crud', () => ({ getCurrentOrganizationId: mocks.currentOrg, getUserOrganizations: mocks.memberships }))
vi.mock('../services/tenant-activation', () => ({ sendTenantActivation: mocks.send }))
import { resendOrganizationActivation } from './activation'

let organization: { owner_id: string | null; status: string; parent_organization_id: string; organization_type: string }
let owner: { role: string; status: string; permissions: Record<string, boolean>; deleted_at: string | null }
beforeEach(() => {
    vi.resetAllMocks()
    organization = { owner_id: 'owner', status: 'active', parent_organization_id: 'reseller', organization_type: 'client' }
    owner = { role: 'owner', status: 'active', permissions: {}, deleted_at: null }
    mocks.client.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: 'actor' } } }) } })
    mocks.superAdmin.mockResolvedValue(false)
    mocks.currentOrg.mockResolvedValue('reseller')
    mocks.memberships.mockResolvedValue([{ organization_id: 'reseller', role: 'owner', status: 'active', organization: { organization_type: 'reseller' } }])
    mocks.send.mockResolvedValue({ sent: true })
    mocks.from.mockImplementation(table => {
        const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(async () => ({ data: table === 'organizations' ? organization : owner, error: null })) }
        query.select.mockReturnValue(query); query.eq.mockReturnValue(query)
        return query
    })
})
describe('activation resend authority', () => {
    it('requires a session before accessing tenants', async () => {
        mocks.client.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } })
        expect((await resendOrganizationActivation('tenant')).success).toBe(false)
        expect(mocks.from).not.toHaveBeenCalled()
    })
    it('lets a reseller send only to an active client in their own network', async () => {
        expect((await resendOrganizationActivation('tenant')).success).toBe(true)
        expect(mocks.send).toHaveBeenCalledWith('tenant', 'reseller', true)
        mocks.send.mockClear()
        organization.parent_organization_id = 'other-reseller'
        expect((await resendOrganizationActivation('tenant')).success).toBe(false)
        expect(mocks.send).not.toHaveBeenCalled()
    })
    it.each(['member', 'blocked'])('rejects reseller %s', async state => {
        mocks.memberships.mockResolvedValue([{ organization_id: 'reseller', role: state === 'member' ? 'member' : 'owner', status: state,
            organization: { organization_type: 'reseller' } }])
        expect((await resendOrganizationActivation('tenant')).success).toBe(false)
        expect(mocks.send).not.toHaveBeenCalled()
    })
    it.each(['proxy', 'blocked', 'deleted', 'missing-owner', 'suspended'])('refuses delivery for %s without changing access', async state => {
        mocks.superAdmin.mockResolvedValue(true)
        if (state === 'proxy') owner.permissions.is_support_proxy = true
        if (state === 'blocked') owner.status = 'blocked'
        if (state === 'deleted') owner.deleted_at = '2026-01-01'
        if (state === 'missing-owner') organization.owner_id = null
        if (state === 'suspended') organization.status = 'suspended'
        expect((await resendOrganizationActivation('tenant')).success).toBe(false)
        expect(mocks.send).not.toHaveBeenCalled()
    })
    it('permits platform admins and returns delivery errors for retry', async () => {
        mocks.superAdmin.mockResolvedValue(true)
        organization.organization_type = 'reseller'
        mocks.send.mockResolvedValue({ sent: false, error: 'Email unavailable' })
        expect(await resendOrganizationActivation('tenant')).toEqual({ success: false, error: 'Email unavailable' })
    })
})
