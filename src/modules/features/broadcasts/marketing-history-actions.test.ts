import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ access: vi.fn(), channel: vi.fn(), from: vi.fn(), rpc: vi.fn(), query: {} as any }))
vi.mock('./marketing-access', () => ({ requireMarketingAccess: mocks.access, assertMarketingChannelAccess: mocks.channel }))
import { getMarketingHistory, getMarketingStepHistory } from './marketing-history-actions'
import { prepareMarketingHistory } from './marketing-history-reader'
const campaignId = '02000000-0000-4000-8000-000000000001', enrollmentId = '07000000-0000-4000-8000-000000000001'
beforeEach(() => {
    vi.resetAllMocks()
    const q: any = {}; for (const key of ['select', 'eq']) q[key] = vi.fn(() => q)
    q.single = vi.fn(async () => ({ data: { connection_id: 'channel-a' }, error: null })); mocks.query = q; mocks.from.mockReturnValue(q)
    mocks.rpc.mockReturnValue({ abortSignal: vi.fn(async () => ({ data: { items: [], hasMore: false, nextCursor: null, queriedAt: 'now', total: 0 }, error: null })) })
    mocks.access.mockResolvedValue({ organizationId: 'tenant-a', canExport: true, session: { from: mocks.from, rpc: mocks.rpc } })
})
describe('Campaign report boundaries', () => {
    it('requires session view authorization before any database call', async () => {
        mocks.access.mockRejectedValue(new Error('Denied'))
        expect((await getMarketingHistory({ campaignId, filters: {} })).success).toBe(false)
        expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('scopes campaign ownership and verifies its channel before requesting recipient data', async () => {
        expect((await getMarketingHistory({ campaignId, filters: { search: ' Test ' } })).success).toBe(true)
        expect(mocks.query.eq).toHaveBeenCalledWith('organization_id', 'tenant-a')
        expect(mocks.channel).toHaveBeenCalledWith(expect.anything(), 'channel-a')
        expect(mocks.rpc).toHaveBeenCalledWith('read_marketing_history', { p_org: 'tenant-a', p_campaign: campaignId,
            p_status: 'all', p_search: 'Test', p_delivery: 'all', p_after: null, p_limit: 25, p_export: false })
    })
    it('rejects an unauthorized channel before privileged report reads', async () => {
        mocks.channel.mockImplementation(() => { throw new Error('Denied') })
        expect((await getMarketingStepHistory({ campaignId, enrollmentId })).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('requires separate export permission, even when view permission is present', async () => {
        mocks.access.mockResolvedValue({ organizationId: 'tenant-a', canExport: false })
        await expect(prepareMarketingHistory(campaignId, true)).rejects.toThrow('exportar')
        expect(mocks.from).not.toHaveBeenCalled()
    })
    it('does not turn a report failure into a fake empty page', async () => {
        mocks.rpc.mockReturnValue({ abortSignal: vi.fn(async () => ({ error: { message: 'PRIVATE' }, data: null })) })
        const result = await getMarketingHistory({ campaignId, filters: {} })
        expect(result.success).toBe(false); expect(result).not.toHaveProperty('page'); expect(JSON.stringify(result)).not.toContain('PRIVATE')
    })
    it('rejects malformed filters and cursors before the RPC', async () => {
        expect((await getMarketingHistory({ campaignId, filters: { organizationId: 'foreign' } })).success).toBe(false)
        expect((await getMarketingStepHistory({ campaignId, enrollmentId, cursor: { stepId: 'bad' } })).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
})
