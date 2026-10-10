import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ access: vi.fn(), channel: vi.fn(), rpc: vi.fn() }))
vi.mock('./marketing-access', () => ({ requireMarketingAccess: mocks.access, assertMarketingChannelAccess: mocks.channel }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { rpc: mocks.rpc } }))
import { prepareMarketingImport, confirmMarketingImport, prepareMarketingRenewal, confirmMarketingRenewal, prepareCampaignActivation } from './marketing-review-actions'
const token = '09000000-0000-4000-8000-000000000001'
const row = { row: 2, name: 'Synthetic', phone: '573001234567', email: '', source: 'form', evidence: 'reference', occurredAt: '2026-01-01T00:00:00Z' }
beforeEach(() => { vi.resetAllMocks(); mocks.access.mockResolvedValue({ organizationId: 'tenant-a', userId: 'actor-a', canExecute: true }); mocks.rpc.mockResolvedValue({ data: {}, error: null }) })
describe('Reviewed marketing operations', () => {
    it.each([() => prepareMarketingImport([row]), () => confirmMarketingImport({ token, rows: [2], confirmed: true }),
        () => prepareMarketingRenewal(row.phone), () => confirmMarketingRenewal({ token, ...row, confirmed: true }), () => prepareCampaignActivation(token)])('checks permission before privileged RPC', async run => {
        mocks.access.mockRejectedValue(new Error('Denied')); expect((await run()).success).toBe(false); expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('requires permission to import AND record evidence', async () => {
        mocks.access.mockResolvedValue({ organizationId: 'tenant-a', userId: 'actor-a', canExecute: false })
        expect((await prepareMarketingImport([row])).success).toBe(false); expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('does not accept a client tenant, implicit confirmation or changed import data', async () => {
        expect((await confirmMarketingImport({ token, rows: [2], confirmed: false })).success).toBe(false)
        expect((await confirmMarketingImport({ token, rows: [2], confirmed: true, organizationId: 'tenant-b' })).success).toBe(false)
        expect((await prepareMarketingImport([{ ...row, phone: '3001234567' }])).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('passes only the ticket and selection at confirmation, with the authenticated actor', async () => {
        expect((await confirmMarketingImport({ token, rows: [2], confirmed: true })).success).toBe(true)
        expect(mocks.rpc).toHaveBeenCalledWith('confirm_marketing_import', { p_org: 'tenant-a', p_actor: 'actor-a', p_ticket: token, p_rows: [2] })
    })
    it('does not expose raw database details on review or renewal failure', async () => {
        mocks.rpc.mockResolvedValue({ data: null, error: { message: 'PRIVATE_SQL_ERROR' } })
        expect(JSON.stringify(await prepareMarketingImport([row]))).not.toContain('PRIVATE_SQL_ERROR')
        expect(JSON.stringify(await prepareMarketingRenewal(row.phone))).not.toContain('PRIVATE_SQL_ERROR')
    })
    it('requires independent, explicit evidence for renewal', async () => {
        const input = { token, source: row.source, evidence: row.evidence, occurredAt: row.occurredAt, confirmed: true }
        expect((await confirmMarketingRenewal({ ...input, confirmed: false })).success).toBe(false)
        expect((await confirmMarketingRenewal(input)).success).toBe(true)
        expect(mocks.rpc).toHaveBeenCalledWith('confirm_marketing_renewal', expect.objectContaining({ p_actor: 'actor-a', p_ticket: token }))
    })
})
