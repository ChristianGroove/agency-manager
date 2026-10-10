import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ access: vi.fn(), channel: vi.fn(), rpc: vi.fn() }))
vi.mock('./marketing-access', () => ({ requireMarketingAccess: mocks.access, assertMarketingChannelAccess: mocks.channel }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { rpc: mocks.rpc } }))
import { getAudienceReadiness, getMarketingSetup, recordMarketingPermission, reviewCampaign } from './marketing-preflight-actions'
const id = '03000000-0000-4000-8000-000000000001'
beforeEach(() => { vi.resetAllMocks(); mocks.access.mockRejectedValue(new Error('Acceso denegado')) })
describe('Marketing preflight authorization', () => {
    it.each([() => getMarketingSetup(), () => getAudienceReadiness({}), () => reviewCampaign(id),
        () => recordMarketingPermission({ phone: '573001234567', source: 'form', evidence: 'reference', occurredAt: '2026-01-01T00:00:00Z', confirmed: true })])('authorizes before any internal call', async run => {
        expect((await run()).success).toBe(false); expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('does not manufacture consent from an unchecked confirmation or local phone', async () => {
        mocks.access.mockResolvedValue({ organizationId: id, userId: id })
        const input = { phone: '3504076800', source: 'form', evidence: 'reference', occurredAt: '2026-01-01T00:00:00Z', confirmed: true }
        expect((await recordMarketingPermission(input)).success).toBe(false)
        expect((await recordMarketingPermission({ ...input, phone: '573001234567', confirmed: false })).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('records canonical consent only for the current tenant and authenticated actor', async () => {
        mocks.access.mockResolvedValue({ organizationId: id, userId: 'actor' }); mocks.rpc.mockResolvedValue({ data: 1, error: null })
        expect((await recordMarketingPermission({ phone: '+57 (300) 123-4567', source: 'form', evidence: 'reference', occurredAt: '2026-01-01T00:00:00Z', confirmed: true })).success).toBe(true)
        expect(mocks.rpc).toHaveBeenCalledWith('record_marketing_consent', expect.objectContaining({ p_org: id, p_actor: 'actor', p_recipient: '573001234567', p_event: 'granted' }))
    })
    it('rejects unknown filters without querying a different audience', async () => {
        mocks.access.mockResolvedValue({ organizationId: id, session: { rpc: mocks.rpc } })
        expect((await getAudienceReadiness({ last_contact_after: '2026-01-01T00:00:00Z' })).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('checks channel authorization before loading its templates', async () => {
        const from = vi.fn()
        mocks.access.mockResolvedValue({ organizationId: id, session: { from } })
        mocks.channel.mockImplementation(() => { throw new Error('Canal no autorizado') })
        expect((await getMarketingSetup(id)).success).toBe(false)
        expect(from).not.toHaveBeenCalled()
    })
    it('reports malformed designs and exclusions without enrolling or emitting', async () => {
        mocks.access.mockResolvedValue({ organizationId: id, session: { rpc: mocks.rpc } })
        mocks.rpc.mockResolvedValue({ data: { campaign: { connection_id: id, delivery_config: { mode: 'growth', humanize: false, timezone: 'America/Bogota' } },
            channel: { status: 'active', provider: 'whatsapp_cloud' }, sequences: [{ is_active: true, steps: [{ type: 'whatsapp', name: 'Paso libre', order_index: 0, content: { body: 'Hola' } }] }],
            templates: [], audience: { eligible: 0, missingConsent: 100 }, missingData: 0 }, error: null })
        const result = await reviewCampaign(id)
        expect(result.success).toBe(true)
        if (result.success) expect(result.review.issues).toEqual(expect.arrayContaining([expect.stringContaining('autorización vigente'), expect.stringContaining('mensaje libre')]))
        expect(mocks.rpc).toHaveBeenCalledTimes(1)
        expect(mocks.rpc).toHaveBeenCalledWith('read_marketing_preflight', { p_org: id, p_campaign: id })
    })
})
