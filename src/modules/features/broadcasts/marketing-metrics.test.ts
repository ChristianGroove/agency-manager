import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ access: vi.fn(), rpc: vi.fn() }))
vi.mock('./marketing-access', () => ({ requireMarketingAccess: mocks.access, assertMarketingChannelAccess: vi.fn() }))
import { getCampaignStats } from './marketing-actions'
const id = '02000000-0000-4000-8000-000000000003'
beforeEach(() => {
    vi.resetAllMocks()
    mocks.access.mockResolvedValue({ organizationId: 'tenant-a', session: { rpc: mocks.rpc } })
})
describe('Campaign results', () => {
    it('requires view access before querying results', async () => {
        mocks.access.mockRejectedValue(new Error('Access denied'))
        expect((await getCampaignStats(id)).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('scopes a single consistent metrics query to the authenticated organization and campaign', async () => {
        const result = { stats: { total: 2, active: 0, completed: 1, failed: 0, cancelled: 1 }, delivery: { accepted: 1, delivered: 0, read: 0, queued: 0, sending: 0, unknown: 0, failed: 0 }, recentActivity: [] }
        mocks.rpc.mockResolvedValue({ data: result, error: null })
        expect(await getCampaignStats(id)).toMatchObject({ success: true, ...result })
        expect(mocks.access).toHaveBeenCalledWith('view')
        expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('read_marketing_campaign_metrics', { p_org: 'tenant-a', p_campaign: id })
    })
    it('does not display fabricated zero metrics when the database is unavailable', async () => {
        mocks.rpc.mockResolvedValue({ data: null, error: { message: 'unavailable' } })
        const result = await getCampaignStats(id)
        expect(result.success).toBe(false)
        expect(result).not.toHaveProperty('stats')
    })
})
