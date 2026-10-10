import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ access: vi.fn(), rpc: vi.fn() }))
vi.mock('./marketing-access', () => ({ requireMarketingAccess: mocks.access }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { getMarketingCampaignPage, getCampaignAudience, saveCampaignAudience, getMarketingAudiencePage } from './marketing-workspace-actions'
const id = '16000000-0000-4000-8000-000000000001'
beforeEach(() => { vi.resetAllMocks(); mocks.access.mockResolvedValue({ organizationId: 'own-org', session: { rpc: mocks.rpc } }); mocks.rpc.mockResolvedValue({ data: { rows: [], next: null }, error: null }) })
describe('Marketing workspace boundaries', () => {
    it.each([() => getMarketingCampaignPage(), () => getCampaignAudience(id), () => saveCampaignAudience(id, {}), () => getMarketingAudiencePage()])('rejects unauthorized calls before any RPC', async call => {
        mocks.access.mockRejectedValue(new Error('Access denied'))
        expect((await call()).success).toBe(false); expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('derives tenant from the session and forwards a bounded cursor contract', async () => {
        expect((await getMarketingCampaignPage({ status: 'paused', search: '%', cursor: { createdAt: '2026-01-01T00:00:00Z', id } })).success).toBe(true)
        expect(mocks.rpc).toHaveBeenCalledWith('read_marketing_campaign_page', expect.objectContaining({ p_org: 'own-org', p_search: '%', p_status: 'paused', p_before_id: id }))
    })
    it('rejects tenant overrides and forged cursors', async () => {
        expect((await getMarketingCampaignPage({ organizationId: 'foreign' } as never)).success).toBe(false)
        expect((await getMarketingCampaignPage({ cursor: { id, createdAt: 'yesterday' } })).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('preserves existing filters through one transactional draft-only RPC', async () => {
        const filters = { has_phone: true, assigned_to: id, created_after: '2025-01-01T00:00:00Z', tags: ['vip'] }
        expect((await saveCampaignAudience(id, filters)).success).toBe(true)
        expect(mocks.access).toHaveBeenCalledWith('manage')
        expect(mocks.rpc).toHaveBeenCalledWith('save_marketing_campaign_audience', { p_org: 'own-org', p_campaign: id, p_filters: filters })
    })
    it('does not expose private database errors', async () => {
        mocks.rpc.mockResolvedValue({ error: { message: 'private database token' }, data: null })
        const result = await getMarketingCampaignPage()
        expect(result.success).toBe(false); expect(JSON.stringify(result)).not.toContain('private database token')
    })
})
