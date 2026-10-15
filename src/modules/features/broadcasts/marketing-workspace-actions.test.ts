import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ access: vi.fn(), rpc: vi.fn() }))
vi.mock('./marketing-access', () => ({ requireMarketingAccess: mocks.access }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { getMarketingCampaignPage, getCampaignAudience, saveCampaignAudience, getMarketingAudiencePage, reorderCampaignSteps, getMarketingAssignees, getMarketingContactListPage } from './marketing-workspace-actions'
const id = '16000000-0000-4000-8000-000000000001'
beforeEach(() => { vi.resetAllMocks(); mocks.access.mockResolvedValue({ organizationId: 'own-org', session: { rpc: mocks.rpc } }); mocks.rpc.mockResolvedValue({ data: { rows: [], next: null }, error: null }) })
describe('Marketing workspace boundaries', () => {
    it('normalizes a selected SMTP sender while preserving tenant-scoped paging', async () => {
        expect((await getMarketingCampaignPage({ channel: `smtp:${id}` })).success).toBe(true)
        expect(mocks.rpc).toHaveBeenCalledWith('read_marketing_campaign_page', expect.objectContaining({ p_org: 'own-org', p_channel: id }))
        mocks.rpc.mockClear()
        expect((await getMarketingCampaignPage({ channel: 'smtp:foreign-value' })).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('reads imported lists through the authenticated tenant and bounded keyset page', async () => {
        expect((await getMarketingContactListPage({ search: ' October ', selected: id })).success).toBe(true)
        expect(mocks.rpc).toHaveBeenCalledWith('read_marketing_contact_list_page', { p_org: 'own-org', p_search: 'October', p_before: null, p_before_id: null, p_selected: id })
    })
    it('rejects list tenant overrides and denied permissions before querying', async () => {
        expect((await getMarketingContactListPage({ organizationId: 'foreign' } as never)).success).toBe(false)
        mocks.access.mockRejectedValue(new Error('Denied'))
        expect((await getMarketingContactListPage()).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it.each([() => getMarketingCampaignPage(), () => getCampaignAudience(id), () => saveCampaignAudience(id, {}), () => getMarketingAudiencePage(), () => getMarketingAssignees(), () => reorderCampaignSteps({ campaignId: id, sequenceId: id, expected: [id], order: [id] })])('rejects unauthorized calls before any RPC', async call => {
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
    it('uses session tenant and the exact expected order in one reorder RPC', async () => {
        const other = '16000000-0000-4000-8000-000000000002'
        mocks.rpc.mockResolvedValue({ data: true, error: null })
        expect((await reorderCampaignSteps({ campaignId: id, sequenceId: id, expected: [id, other], order: [other, id] })).success).toBe(true)
        expect(mocks.access).toHaveBeenCalledWith('manage')
        expect(mocks.rpc).toHaveBeenCalledWith('reorder_marketing_steps', { p_org: 'own-org', p_campaign: id, p_sequence: id, p_expected: [id, other], p_order: [other, id] })
    })
    it('rejects duplicate, incomplete, foreign or client-tenant step payloads without touching the database', async () => {
        const other = '16000000-0000-4000-8000-000000000002'
        for (const input of [
            { expected: [id, other], order: [id, id] }, { expected: [id, other], order: [other] },
            { expected: [id], order: [other] }, { expected: [id], order: [id], organizationId: 'foreign' },
        ]) expect((await reorderCampaignSteps({ campaignId: id, sequenceId: id, ...input })).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('does not expose underlying lock or private database errors during reorder', async () => {
        mocks.rpc.mockResolvedValue({ data: null, error: { message: 'private token in lock error' } })
        const result = await reorderCampaignSteps({ campaignId: id, sequenceId: id, expected: [id], order: [id] })
        expect(result.success).toBe(false); expect(JSON.stringify(result)).not.toContain('private token')
    })
    it('queries names with a bounded tenant-derived assignee cursor', async () => {
        expect((await getMarketingAssignees({ search: ' Ana ', cursor: id, selected: id })).success).toBe(true)
        expect(mocks.rpc).toHaveBeenCalledWith('read_marketing_assignees', { p_org: 'own-org', p_search: 'Ana', p_after: id, p_selected: id })
    })
    it('rejects reversed dates or scores before saving audience filters', async () => {
        for (const filters of [{ score_min: 10, score_max: 1 }, { created_after: '2026-01-02T00:00:00Z', created_before: '2026-01-01T00:00:00Z' }, { last_activity_after: '2026-01-02T00:00:00Z', last_activity_before: '2026-01-01T00:00:00Z' }])
            expect((await saveCampaignAudience(id, filters)).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
})
