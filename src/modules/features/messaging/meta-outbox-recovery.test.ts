import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ limit: vi.fn(), rpc: vi.fn(), dispatch: vi.fn() }))
vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: () => {
            const query: any = {}
            for (const method of ['select', 'eq', 'lt', 'lte', 'order']) query[method] = () => query
            query.limit = mocks.limit
            return query
        },
        rpc: mocks.rpc,
    },
}))
vi.mock('./meta-outbox', () => ({ dispatchMetaOutbound: mocks.dispatch }))

import { recoverMetaOutbound } from './meta-outbox-recovery'

beforeEach(() => {
    mocks.limit.mockResolvedValueOnce({ data: [{ id: 'ambiguous' }], error: null })
        .mockResolvedValueOnce({ data: [{ id: 'queued' }], error: null })
    mocks.rpc.mockResolvedValue({ error: null })
    mocks.dispatch.mockResolvedValue({ status: 'accepted' })
})
afterEach(() => vi.clearAllMocks())

describe('Meta outbound recovery', () => {
    it('marks stale in-flight work unknown and sends only queued work', async () => {
        expect(await recoverMetaOutbound()).toEqual({ examinedQueued: 1, examinedStale: 1, failed: 0 })
        expect(mocks.rpc).toHaveBeenCalledWith('finish_meta_outbound', expect.objectContaining({
            p_outbox_id: 'ambiguous', p_status: 'unknown',
        }))
        expect(mocks.dispatch).toHaveBeenCalledOnce()
        expect(mocks.dispatch).toHaveBeenCalledWith('queued')
    })
})
