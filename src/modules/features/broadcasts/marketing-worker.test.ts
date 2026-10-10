import { describe, expect, it, vi } from 'vitest'
import { marketingTick } from '../../../../scripts/marketing-worker.mjs'
describe('Coolify marketing tick', () => {
    it('never invokes the engine with execution disabled', async () => {
        const fetcher = vi.fn()
        expect(await marketingTick({}, fetcher)).toEqual({ disabled: true })
        expect(fetcher).not.toHaveBeenCalled()
    })
    it('uses a local POST and omits secrets and arbitrary text from its result', async () => {
        const fetcher = vi.fn(async () => new Response(JSON.stringify({ success: true, processed: 1, failed: 0, deferred: 2, finalized: 0, logs: ['secret'] })))
        const result = await marketingTick({ MARKETING_EXECUTION_ENABLED: 'true', CRON_SECRET: 'secret', PORT: '3001' }, fetcher)
        expect(fetcher).toHaveBeenCalledWith('http://127.0.0.1:3001/api/marketing/run', expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer secret' } }))
        expect(result).toEqual({ processed: 1, failed: 0, deferred: 2, finalized: 0 })
    })
    it.each([{ success: false }, { success: true, processed: -1 }, { success: true, processed: 'not-a-count' }])('rejects invalid or failed responses: %j', async body => {
        await expect(marketingTick({ MARKETING_EXECUTION_ENABLED: 'true', CRON_SECRET: 'secret' }, vi.fn(async () => new Response(JSON.stringify(body))))).rejects.toThrow('cycle')
    })
})
