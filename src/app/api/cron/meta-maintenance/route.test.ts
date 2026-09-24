import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ list: vi.fn(), process: vi.fn(), recover: vi.fn(), rpc: vi.fn() }))
vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: () => ({ select: () => ({ is: () => ({ order: () => ({ limit: mocks.list }) }) }) }),
        rpc: mocks.rpc,
    },
}))
vi.mock('@/modules/infrastructure/meta/services/process-persisted-webhook', () => ({ processPersistedMetaWebhook: mocks.process }))
vi.mock('@/modules/features/messaging/meta-outbox-recovery', () => ({ recoverMetaOutbound: mocks.recover }))

import { POST } from './route'

const request = (authorized = true) => new Request('https://pixy.test/api/cron/meta-maintenance', {
    method: 'POST', headers: authorized ? { authorization: 'Bearer secret' } : {},
})
beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'secret')
    mocks.list.mockResolvedValue({ data: [{ id: 'pending-a' }], error: null })
    mocks.process.mockResolvedValue(undefined)
    mocks.recover.mockResolvedValue({ examinedQueued: 1, examinedStale: 0, failed: 0 })
    mocks.rpc.mockResolvedValue({ data: 0, error: null })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks() })

describe('Meta maintenance cron', () => {
    it('requires the existing cron secret before any work', async () => {
        expect((await POST(request(false))).status).toBe(401)
        expect(mocks.list).not.toHaveBeenCalled()
    })

    it('recovers pending work and expires coexistence onboarding', async () => {
        const response = await POST(request())
        expect(response.status).toBe(200)
        expect(await response.json()).toMatchObject({ processedWebhooks: 1, failedWebhooks: 0,
            examinedQueued: 1, failedOutbound: 0 })
        expect(mocks.process).toHaveBeenCalledWith('pending-a')
        expect(mocks.rpc).toHaveBeenCalledWith('expire_meta_coexistence_onboarding')
    })

    it('reports a failed webhook while continuing outbound recovery', async () => {
        mocks.process.mockRejectedValue(new Error('retry later'))
        const response = await POST(request())
        expect(response.status).toBe(500)
        expect(await response.json()).toMatchObject({ failedWebhooks: 1, examinedQueued: 1 })
        expect(mocks.recover).toHaveBeenCalledOnce()
    })
})
