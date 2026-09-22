import { afterEach, describe, expect, it, vi } from 'vitest'
import { processMetaControlEvents } from './webhook-events'

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: { rpc: mocks.rpc },
}))

afterEach(() => mocks.rpc.mockReset())

describe('Meta coexistence account updates', () => {
    it('applies temporary offboarding and reconnection by WABA without a phone ID', async () => {
        mocks.rpc.mockResolvedValue({ data: 1, error: null })
        for (const event of ['ACCOUNT_OFFBOARDED', 'ACCOUNT_RECONNECTED']) {
            await processMetaControlEvents({ entry: [{
                id: '123456789', time: 1790000000,
                changes: [{ field: 'account_update', value: { event } }],
            }] })
        }
        expect(mocks.rpc).toHaveBeenNthCalledWith(1, 'apply_meta_account_update', expect.objectContaining({
            p_waba_id: '123456789', p_event: 'ACCOUNT_OFFBOARDED',
        }))
        expect(mocks.rpc).toHaveBeenNthCalledWith(2, 'apply_meta_account_update', expect.objectContaining({
            p_waba_id: '123456789', p_event: 'ACCOUNT_RECONNECTED',
        }))
    })

    it('preserves the Meta disconnection reason for a final partner removal', async () => {
        mocks.rpc.mockResolvedValue({ data: 1, error: null })
        await processMetaControlEvents({ entry: [{ id: '123456789', changes: [{
            field: 'account_update', value: {
                event: 'PARTNER_REMOVED', disconnection_info: { reason: 'ACCOUNT_DISCONNECTED', initiated_by: 'CLIENT' },
            },
        }] }] })
        expect(mocks.rpc).toHaveBeenCalledWith('apply_meta_account_update', expect.objectContaining({
            p_reason: 'ACCOUNT_DISCONNECTED', p_initiated_by: 'CLIENT',
        }))
    })
})
