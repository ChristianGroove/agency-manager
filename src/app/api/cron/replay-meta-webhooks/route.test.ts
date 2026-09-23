import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ process: vi.fn(), list: vi.fn() }))
vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: { from: () => ({
        select: () => ({ is: () => ({ order: () => ({ limit: mocks.list }) }) }),
    }) },
}))
vi.mock('@/modules/infrastructure/meta/services/process-persisted-webhook', () => ({
    processPersistedMetaWebhook: mocks.process,
}))

import { POST } from './route'

beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'secret')
    mocks.list.mockResolvedValue({ data: [{ id: 'first' }, { id: 'second' }], error: null })
    mocks.process.mockResolvedValue(undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks() })

describe('Meta webhook recovery', () => {
    it('requires the cron secret before reading pending events', async () => {
        const response = await POST(new Request('https://pixy.test/api/cron/replay-meta-webhooks', { method: 'POST' }))
        expect(response.status).toBe(401)
        expect(mocks.list).not.toHaveBeenCalled()
    })

    it('processes pending persisted events', async () => {
        const response = await POST(new Request('https://pixy.test/api/cron/replay-meta-webhooks', {
            method: 'POST', headers: { authorization: 'Bearer secret' },
        }))
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ processed: 2, failed: 0 })
        expect(mocks.process).toHaveBeenCalledWith('first')
        expect(mocks.process).toHaveBeenCalledWith('second')
    })

    it('reports failed events without acknowledging them', async () => {
        mocks.process.mockRejectedValueOnce(new Error('retry later'))
        const response = await POST(new Request('https://pixy.test/api/cron/replay-meta-webhooks', {
            method: 'POST', headers: { authorization: 'Bearer secret' },
        }))
        expect(response.status).toBe(500)
        expect(await response.json()).toEqual({ processed: 1, failed: 1 })
    })
})
