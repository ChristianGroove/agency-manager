import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ access: vi.fn(), scope: vi.fn(), probe: vi.fn(), rpc: vi.fn() }))
vi.mock('./marketing-access', () => ({ requireMarketingAccess: mocks.access, assertMarketingChannelAccess: mocks.scope }))
vi.mock('./marketing-channel-health', () => ({ probeMarketingChannel: mocks.probe }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { rpc: mocks.rpc } }))
import { acknowledgeMarketingHold, refreshMarketingChannelHealth } from './marketing-health-actions'
const id = '03000000-0000-4000-8000-000000000001'
const request = { connectionId: id, holdAt: '2026-10-09T20:00:00+00:00', reviewed: true }
beforeEach(() => { vi.resetAllMocks(); mocks.access.mockResolvedValue({ organizationId: 'org', userId: 'actor' }); mocks.rpc.mockResolvedValue({ error: null }) })
describe('Marketing health action authorization', () => {
    it.each([() => refreshMarketingChannelHealth(id), () => acknowledgeMarketingHold(request)])('checks execution permission before any internal call', async run => {
        mocks.access.mockRejectedValue(new Error('denied'))
        expect((await run()).success).toBe(false)
        expect(mocks.probe).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('checks channel scope before resolving credentials or probing Meta', async () => {
        mocks.scope.mockImplementation(() => { throw new Error('denied') })
        expect((await refreshMarketingChannelHealth(id)).success).toBe(false)
        expect(mocks.probe).not.toHaveBeenCalled()
    })
    it('scopes the check to the authenticated organization', async () => {
        mocks.probe.mockResolvedValue('GREEN')
        expect((await refreshMarketingChannelHealth(id)).success).toBe(true)
        expect(mocks.probe).toHaveBeenCalledWith('org', id)
    })
    it('requires explicit confirmation rather than merely refreshing quality', async () => {
        expect((await acknowledgeMarketingHold({ ...request, reviewed: false })).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('binds the review to the authenticated actor and the specific hold version', async () => {
        expect((await acknowledgeMarketingHold(request)).success).toBe(true)
        expect(mocks.rpc).toHaveBeenCalledWith('acknowledge_marketing_channel_hold', {
            p_org: 'org', p_connection: id, p_actor: 'actor', p_expected_hold: request.holdAt,
        })
    })
})
