import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), refresh: vi.fn() }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { rpc: mocks.rpc } }))
vi.mock('./marketing-channel-health', () => ({ refreshStaleMarketingChannels: mocks.refresh }))
import { observeMarketingRun } from './marketing-runtime'
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('MARKETING_EXECUTION_ENABLED', 'true'); mocks.rpc.mockResolvedValue({ data: 'run-id', error: null }) })
afterEach(() => vi.unstubAllEnvs())
describe('Durable marketing execution evidence', () => {
    it('does not write evidence or query Meta when disabled', async () => {
        vi.stubEnv('MARKETING_EXECUTION_ENABLED', '')
        await observeMarketingRun(async () => ({ success: true, disabled: true }))
        expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.refresh).not.toHaveBeenCalled()
    })
    it('records a partial failure truthfully after health refresh and execution', async () => {
        const run = vi.fn(async () => ({ success: true, processed: 1, failed: 2 }))
        await observeMarketingRun(run)
        expect(mocks.refresh.mock.invocationCallOrder[0]).toBeLessThan(run.mock.invocationCallOrder[0])
        expect(mocks.rpc).toHaveBeenLastCalledWith('record_marketing_worker_run', { p_run: 'run-id', p_result: { success: true, processed: 1, failed: 2 }, p_failed: true })
    })
    it('records thrown failures without persisting the exception or inventing success', async () => {
        await expect(observeMarketingRun(async () => { throw new Error('secret') })).rejects.toThrow('secret')
        expect(mocks.rpc).toHaveBeenLastCalledWith('record_marketing_worker_run', { p_run: 'run-id', p_result: {}, p_failed: true })
    })
    it('does not execute when the start cannot be recorded', async () => {
        mocks.rpc.mockResolvedValue({ error: {} })
        const run = vi.fn()
        await expect(observeMarketingRun(run)).rejects.toThrow('inicio')
        expect(run).not.toHaveBeenCalled()
    })
    it('surfaces failure to acknowledge the cycle', async () => {
        mocks.rpc.mockResolvedValueOnce({ data: 'run-id' }).mockResolvedValueOnce({ error: {} })
        await expect(observeMarketingRun(async () => ({ success: true }))).rejects.toThrow('resultado')
    })
})
