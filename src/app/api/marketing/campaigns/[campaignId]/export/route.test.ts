import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ prepare: vi.fn(), recipients: vi.fn(), steps: vi.fn() }))
vi.mock('@/modules/features/broadcasts/marketing-history-reader', () => ({ prepareMarketingHistory: mocks.prepare, readMarketingHistory: mocks.recipients, readMarketingSteps: mocks.steps }))
import { GET } from './route'
const campaignId = '02000000-0000-4000-8000-000000000001'
const context = { params: Promise.resolve({ campaignId }) }
const row = { id: 'row-a', name: '=PrivateFormula', phone: '123', status: 'active', counts: { total: 0, queued: 0, sending: 0, accepted: 0, delivered: 0, read: 0, failed: 0, unknown: 0 } }
beforeEach(() => {
    vi.resetAllMocks(); mocks.prepare.mockResolvedValue({ organization: 'authenticated' })
    mocks.recipients.mockResolvedValue({ items: [row], hasMore: false, nextCursor: null, queriedAt: 'now', total: 1 })
})
describe('Authenticated streamed report export', () => {
    it('rejects permission failures before querying or returning an attachment', async () => {
        mocks.prepare.mockRejectedValue(new Error('SECRET'))
        const response = await GET(new NextRequest('http://local/export'), context)
        expect(response.status).toBe(400); expect(mocks.recipients).not.toHaveBeenCalled()
        expect(await response.text()).not.toContain('SECRET')
    })
    it('exports all filtered pages with permission checks delegated to every scoped RPC', async () => {
        mocks.recipients.mockResolvedValueOnce({ items: [row], hasMore: true, nextCursor: 'cursor', queriedAt: 'first', total: 2 })
            .mockResolvedValueOnce({ items: [{ ...row, id: 'row-b' }], hasMore: false, nextCursor: null, queriedAt: 'second' })
        const response = await GET(new NextRequest('http://local/export?status=active&search=PrivateFormula'), context)
        const csv = await response.text()
        expect(response.headers.get('cache-control')).toBe('private, no-store'); expect(response.headers.get('content-disposition')).toContain(campaignId)
        expect(mocks.prepare).toHaveBeenCalledWith(campaignId, true)
        expect(mocks.recipients).toHaveBeenLastCalledWith(expect.anything(), { status: 'active', search: 'PrivateFormula', delivery: 'all' }, 'cursor', 100)
        expect(csv).toContain('row-a'); expect(csv).toContain('row-b'); expect(csv).toContain('"\'=PrivateFormula"')
    })
    it('fails the stream instead of saving a misleading complete report after a revoked permission or database failure', async () => {
        mocks.recipients.mockResolvedValueOnce({ items: [row], hasMore: true, nextCursor: 'cursor', queriedAt: 'first', total: 2 })
            .mockRejectedValueOnce(new Error('SECRET'))
        const response = await GET(new NextRequest('http://local/export'), context)
        await expect(response.text()).rejects.toThrow('No se pudo completar')
    })
    it('rejects oversized exports and unsupported query fields', async () => {
        mocks.recipients.mockResolvedValue({ items: [], total: 50001 })
        expect((await GET(new NextRequest('http://local/export'), context)).status).toBe(422)
        expect((await GET(new NextRequest('http://local/export?organizationId=foreign'), context)).status).toBe(400)
    })
})
