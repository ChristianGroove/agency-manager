import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
    rpc: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.from,
        rpc: mocks.rpc,
    },
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

function updateQuery(error: unknown = null) {
    const chain: any = {}
    chain.update = vi.fn(() => chain)
    chain.eq = vi.fn(() => chain)
    chain.then = (resolve: any, reject: any) => Promise.resolve({ error }).then(resolve, reject)
    return chain
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.from.mockReset()
    mocks.rpc.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
})

describe('portal token service tenant safety', () => {
    it('regenerates portal tokens only within the active organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.rpc.mockResolvedValue({ data: 'new-token', error: null })
        const leadUpdate = updateQuery(null)
        mocks.from.mockReturnValue(leadUpdate)

        const { regeneratePortalToken } = await import('./token-service')
        const result = await regeneratePortalToken('client-current')

        expect(result).toEqual({ success: true, token: 'new-token' })
        expect(mocks.rpc).toHaveBeenCalledWith('generate_short_token')
        expect(leadUpdate.update).toHaveBeenCalledWith(expect.objectContaining({
            portal_short_token: 'new-token',
        }))
        expect(leadUpdate.eq).toHaveBeenCalledWith('id', 'client-current')
        expect(leadUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('does not generate tokens without an active organization', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue(null)

        const { regeneratePortalToken } = await import('./token-service')
        const result = await regeneratePortalToken('client-current')

        expect(result).toEqual({ success: false, error: 'Error regenerating token' })
        expect(mocks.rpc).not.toHaveBeenCalled()
        expect(mocks.from).not.toHaveBeenCalled()
        expect(consoleError).toHaveBeenCalled()
    })

    it('updates portal token expiration only within the active organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const leadUpdate = updateQuery(null)
        mocks.from.mockReturnValue(leadUpdate)

        const { updatePortalTokenExpiration } = await import('./token-service')
        const result = await updatePortalTokenExpiration('client-current', false, '2026-12-31')

        expect(result).toEqual({ success: true })
        expect(leadUpdate.update).toHaveBeenCalledWith({
            portal_token_never_expires: false,
            portal_token_expires_at: '2026-12-31',
        })
        expect(leadUpdate.eq).toHaveBeenCalledWith('id', 'client-current')
        expect(leadUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('updates client portal config only within the active organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const leadUpdate = updateQuery(null)
        mocks.from.mockReturnValue(leadUpdate)

        const { updateClientPortalConfig } = await import('./token-service')
        const result = await updateClientPortalConfig('client-current', { enabled: true })

        expect(result).toEqual({ success: true })
        expect(leadUpdate.update).toHaveBeenCalledWith({
            portal_config: { enabled: true },
        })
        expect(leadUpdate.eq).toHaveBeenCalledWith('id', 'client-current')
        expect(leadUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })
})
