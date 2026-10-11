import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ client: vi.fn(), adminFrom: vi.fn(), currentOrg: vi.fn(), superAdmin: vi.fn(), insert: vi.fn() }))
vi.mock('@/modules/core/database/supabase-server', () => ({ createClient: mocks.client }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { from: mocks.adminFrom } }))
vi.mock('@/modules/core/organizations/actions/crud', () => ({ getCurrentOrganizationId: mocks.currentOrg }))
vi.mock('@/modules/core/iam/services/platform-roles', () => ({ isSuperAdmin: mocks.superAdmin }))
import { createInviteLink } from './invitation-actions'

let membership: { role: string; status: string; organization: { organization_type: string } }
beforeEach(() => {
    vi.clearAllMocks()
    membership = { role: 'owner', status: 'active', organization: { organization_type: 'reseller' } }
    mocks.currentOrg.mockResolvedValue('reseller-org')
    mocks.superAdmin.mockResolvedValue(false)
    mocks.client.mockImplementation(async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'creator' } } }) },
        from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: membership, error: null }) }) }) }) })
    }))
    mocks.adminFrom.mockImplementation(() => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { organization_type: 'reseller' } }) }) }),
        insert: mocks.insert
    }))
    mocks.insert.mockImplementation(row => ({ select: () => ({ single: async () => ({ data: row, error: null }) }) }))
})

describe('invitation provisioning authority', () => {
    it.each(['member', 'blocked'])('rejects a reseller %s without creating an invitation', async state => {
        if (state === 'member') membership.role = 'member'
        else membership.status = 'blocked'
        expect((await createInviteLink()).success).toBe(false)
        expect(mocks.insert).not.toHaveBeenCalled()
    })
    it('does not let a reseller invite another reseller', async () => {
        expect((await createInviteLink({ target_organization_type: 'reseller' })).success).toBe(false)
        expect(mocks.insert).not.toHaveBeenCalled()
    })
    it('binds client invitations to the authorized reseller network', async () => {
        expect((await createInviteLink({ target_organization_type: 'client' })).success).toBe(true)
        expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ reseller_org_id: 'reseller-org', created_by: 'creator' }))
    })
    it('does not allow an ordinary client organization to create invitations', async () => {
        membership.organization.organization_type = 'client'
        expect((await createInviteLink()).success).toBe(false)
        expect(mocks.insert).not.toHaveBeenCalled()
    })
    it('uses a cryptographically random code and normalizes recipient email', async () => {
        expect((await createInviteLink({ recipient_email: ' OWNER@example.com ' })).success).toBe(true)
        expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
            code: expect.stringMatching(/^INV-[0-9A-F]{32}$/), recipient_email: 'owner@example.com'
        }))
    })
    it.each([0, -1, 1.5])('rejects invalid usage limit %s', async max_uses => {
        expect((await createInviteLink({ max_uses })).success).toBe(false)
        expect(mocks.insert).not.toHaveBeenCalled()
    })
})
