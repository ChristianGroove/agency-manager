import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(), getOrg: vi.fn(), requireRole: vi.fn(), revalidate: vi.fn(), encrypt: vi.fn(),
}))
vi.mock('@/modules/core/database/supabase-server', () => ({ createClient: mocks.createClient }))
vi.mock('@/modules/core/organizations/organization-actions', () => ({ getCurrentOrganizationId: mocks.getOrg }))
vi.mock('@/modules/core/iam/services/org-roles', () => ({ requireOrgRole: mocks.requireRole }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }))
vi.mock('@/modules/infrastructure/integrations/encryption', () => ({ encryptObject: mocks.encrypt }))
vi.mock('@/modules/infrastructure/integrations/connection-secrets', () => ({
    resolveConnectionCredentials: vi.fn(), assertRawCredentialInput: vi.fn(),
}))

describe('disconnect channel', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.getOrg.mockResolvedValue('tenant-a')
        mocks.requireRole.mockResolvedValue(undefined)
        mocks.encrypt.mockReturnValue({ encrypted: 'empty' })
    })

    it('preserves the connection record and history while removing local authorization', async () => {
        const lookup: any = { select: vi.fn(() => lookup), eq: vi.fn(() => lookup),
            single: vi.fn(async () => ({ data: { id: 'channel-a', status: 'active' }, error: null })) }
        const update: any = { update: vi.fn(() => update), eq: vi.fn(() => update),
            select: vi.fn(() => update), single: vi.fn(async () => ({ data: { id: 'channel-a' }, error: null })) }
        const from = vi.fn().mockReturnValueOnce(lookup).mockReturnValueOnce(update)
        mocks.createClient.mockResolvedValue({ from })

        const { deleteChannel } = await import('./actions')
        expect(await deleteChannel('channel-a')).toBe(true)
        expect(mocks.requireRole).toHaveBeenCalledWith('admin')
        expect(update.update).toHaveBeenCalledWith({ status: 'deleted', credentials: { encrypted: 'empty' }, is_primary: false })
        expect(update.eq).toHaveBeenCalledWith('organization_id', 'tenant-a')
        expect(mocks.revalidate).toHaveBeenCalledWith('/crm/settings/channels')
    })
})
