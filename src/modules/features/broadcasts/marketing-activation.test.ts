import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ access: vi.fn(), channel: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }))
vi.mock('./marketing-access', () => ({ requireMarketingAccess: mocks.access, assertMarketingChannelAccess: mocks.channel }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { rpc: mocks.rpc } }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }))
import { enrollAudienceInCampaign } from './marketing-actions'

const confirmation = { token: '09000000-0000-4000-8000-000000000001', confirmed: true }
const campaignId = '02000000-0000-4000-8000-000000000003'
const connectionId = '03000000-0000-4000-8000-000000000001'
const templateId = '08000000-0000-4000-8000-000000000001'
const selection = { template_id: templateId, template_name: 'promo', template_language: 'es', bindings: {} }
const review = {
    campaign: { connection_id: connectionId, delivery_config: { mode: 'growth', humanize: false, timezone: 'America/Bogota' } },
    channel: { status: 'active', provider: 'whatsapp_cloud' }, audience: { eligible: 1 }, missingData: 0,
    sequences: [{ is_active: true, steps: [{ name: 'Oferta', type: 'whatsapp', order_index: 0, content: selection }] }],
    templates: [{ id: templateId, channel_id: connectionId, name: 'promo', language: 'es', status: 'APPROVED', category: 'MARKETING', meta_id: 'fixture', components: [{ type: 'BODY', text: 'Oferta' }] }],
}
const prepared = { review, design: { campaign: { connection_id: connectionId }, filters: {} }, fingerprint: 'database-design-fingerprint' }

beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('MARKETING_EXECUTION_ENABLED', 'true')
    const query: any = {}; for (const method of ['select', 'eq']) query[method] = vi.fn(() => query)
    query.single = vi.fn(async () => ({ data: { connection_id: connectionId }, error: null }))
    mocks.access.mockResolvedValue({ organizationId: 'tenant-a', userId: 'actor-a', session: { from: vi.fn(() => query) } })
    mocks.rpc.mockResolvedValueOnce({ data: prepared, error: null }).mockResolvedValueOnce({ data: { enrolled: 1, resumed: false }, error: null })
})
afterEach(() => vi.unstubAllEnvs())

describe('Transactional marketing activation boundary', () => {
    it('stays disabled by default without creating recipients', async () => {
        vi.stubEnv('MARKETING_EXECUTION_ENABLED', '')
        expect((await enrollAudienceInCampaign(campaignId, confirmation)).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('revalidates a saved design and passes only the database fingerprint and authenticated actor', async () => {
        expect(await enrollAudienceInCampaign(campaignId, confirmation)).toMatchObject({ success: true, enrolled: 1 })
        expect(mocks.access).toHaveBeenCalledWith('execute')
        expect(mocks.channel).toHaveBeenCalledTimes(2)
        expect(mocks.rpc).toHaveBeenLastCalledWith('confirm_marketing_activation_review', {
            p_org: 'tenant-a', p_campaign: campaignId, p_ticket: confirmation.token, p_actor: 'actor-a',
        })
    })
    it('rejects a changed or unavailable design without claiming successful activation', async () => {
        mocks.rpc.mockReset().mockResolvedValueOnce({ data: prepared, error: null }).mockResolvedValueOnce({ data: null, error: { message: 'Campaign changed' } })
        expect((await enrollAudienceInCampaign(campaignId, confirmation)).success).toBe(false)
        expect(mocks.revalidate).not.toHaveBeenCalled()
    })
    it.each(['consent', 'variables', 'template'])('refuses activation when the final review fails: %s', async reason => {
        const invalid = structuredClone(prepared)
        if (reason === 'consent') invalid.review.audience.eligible = 0
        if (reason === 'variables') invalid.review.missingData = 1
        if (reason === 'template') invalid.review.templates[0].status = 'PAUSED'
        mocks.rpc.mockReset().mockResolvedValue({ data: invalid, error: null })
        expect((await enrollAudienceInCampaign(campaignId, confirmation)).success).toBe(false)
        expect(mocks.rpc).toHaveBeenCalledTimes(1)
    })
    it('denies a changed channel permission before activation', async () => {
        mocks.channel.mockImplementationOnce(() => undefined).mockImplementationOnce(() => { throw new Error('Channel access denied') })
        expect((await enrollAudienceInCampaign(campaignId, confirmation)).success).toBe(false)
        expect(mocks.rpc).toHaveBeenCalledTimes(1)
    })
    it('resumes the original recipients instead of requiring a newly edited audience to match them again', async () => {
        const resumed = { ...prepared, review: { ...review, campaign: { ...review.campaign, status: 'paused', execution_version: 2 }, audience: { eligible: 0 }, missingData: 1 } }
        mocks.rpc.mockReset().mockResolvedValueOnce({ data: resumed, error: null }).mockResolvedValueOnce({ data: { enrolled: 0, resumed: true }, error: null })
        expect(await enrollAudienceInCampaign(campaignId, confirmation)).toMatchObject({ success: true, enrolled: 0, resumed: true })
        expect(mocks.rpc).toHaveBeenCalledTimes(2)
    })
    it('rejects activation without an explicit reviewed ticket', async () => {
        expect((await enrollAudienceInCampaign(campaignId)).success).toBe(false)
        expect((await enrollAudienceInCampaign(campaignId, { ...confirmation, confirmed: false })).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('requires the execution permission before any privileged read', async () => {
        mocks.access.mockRejectedValue(new Error('Permission denied'))
        expect((await enrollAudienceInCampaign(campaignId, confirmation)).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
})
