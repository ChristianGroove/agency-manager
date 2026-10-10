import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ access: vi.fn(), channel: vi.fn(), rpc: vi.fn() }))
vi.mock('./marketing-access', () => ({ requireMarketingAccess: mocks.access, assertMarketingChannelAccess: mocks.channel }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { rpc: mocks.rpc } }))
import { prepareMarketingImport, confirmMarketingImport, prepareMarketingRenewal, confirmMarketingRenewal, prepareCampaignActivation, prepareMarketingContactImport, prepareMarketingListAuthorization, confirmMarketingListAuthorization } from './marketing-review-actions'
const token = '09000000-0000-4000-8000-000000000001'
const row = { row: 2, name: 'Synthetic', phone: '573001234567', email: '', source: 'form', evidence: 'reference', occurredAt: '2026-01-01T00:00:00Z' }
beforeEach(() => { vi.resetAllMocks(); mocks.access.mockResolvedValue({ organizationId: 'tenant-a', userId: 'actor-a', canExecute: true }); mocks.rpc.mockResolvedValue({ data: {}, error: null }) })
describe('Reviewed marketing operations', () => {
    it('creates a named list through the atomic import RPC with the authenticated actor', async () => {
        expect((await confirmMarketingImport({ token, rows: [2], confirmed: true, listName: ' October ' })).success).toBe(true)
        expect(mocks.rpc).toHaveBeenCalledWith('confirm_marketing_list_import', { p_org: 'tenant-a', p_actor: 'actor-a', p_ticket: token, p_rows: [2], p_name: 'October' })
    })
    it('rejects an empty list name before confirming contacts', async () => {
        expect((await confirmMarketingImport({ token, rows: [2], confirmed: true, listName: ' ' })).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
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

describe('Contact storage and external batch declaration', () => {
    it('allows contact storage with import permission without granting execute permission', async () => {
        mocks.access.mockResolvedValue({ organizationId: 'tenant-a', userId: 'actor-a', canExecute: false })
        const contact = { row: 2, name: row.name, phone: row.phone, email: '' }
        expect((await prepareMarketingContactImport([contact])).success).toBe(true)
        expect(mocks.rpc).toHaveBeenCalledWith('prepare_marketing_contact_import', { p_org: 'tenant-a', p_actor: 'actor-a', p_rows: [contact] })
        expect((await confirmMarketingImport({ token, rows: [2], confirmed: true, listName: 'List', mode: 'contacts' })).success).toBe(true)
        expect(mocks.rpc).toHaveBeenLastCalledWith('confirm_marketing_contact_import', { p_org: 'tenant-a', p_actor: 'actor-a', p_ticket: token, p_rows: [2], p_name: 'List' })
    })
    it('rejects contact evidence fields, unknown tenant fields and unnamed plain lists', async () => {
        expect((await prepareMarketingContactImport([row])).success).toBe(false)
        expect((await confirmMarketingImport({ token, rows: [2], confirmed: true, mode: 'contacts' })).success).toBe(false)
        expect((await confirmMarketingListAuthorization({ token, confirmed: true, organizationId: 'tenant-b' })).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('requires execute permission for declarations, independently from storage', async () => {
        mocks.access.mockRejectedValue(new Error('Denied'))
        expect((await prepareMarketingListAuthorization(token)).success).toBe(false)
        expect((await confirmMarketingListAuthorization({ token, confirmed: true })).success).toBe(false)
        expect(mocks.access).toHaveBeenCalledWith('execute')
        expect(mocks.rpc).not.toHaveBeenCalled()
    })
    it('requires explicit declaration but leaves reference optional and uses the authenticated tenant', async () => {
        expect((await confirmMarketingListAuthorization({ token, confirmed: false })).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
        expect((await confirmMarketingListAuthorization({ token, confirmed: true })).success).toBe(true)
        expect(mocks.rpc).toHaveBeenCalledWith('confirm_marketing_list_authorization', { p_org: 'tenant-a', p_actor: 'actor-a', p_ticket: token, p_confirmed: true, p_reference: '' })
    })
    it('does not expose private SQL errors or accept a fabricated original consent date', async () => {
        expect((await confirmMarketingListAuthorization({ token, confirmed: true, occurredAt: '2026-01-01T00:00:00Z' })).success).toBe(false)
        mocks.rpc.mockResolvedValue({ data: null, error: { message: 'PRIVATE_SQL_ERROR' } })
        expect(JSON.stringify(await prepareMarketingListAuthorization(token))).not.toContain('PRIVATE_SQL_ERROR')
        expect(JSON.stringify(await confirmMarketingListAuthorization({ token, confirmed: true }))).not.toContain('PRIVATE_SQL_ERROR')
    })
})
