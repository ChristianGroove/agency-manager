import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    resolve: vi.fn(), control: vi.fn(), handle: vi.fn(), update: vi.fn(), read: vi.fn(),
}))
vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: { from: () => ({
        select: () => ({ eq: () => ({ single: mocks.read }) }),
        update: () => ({ eq: () => ({ is: mocks.update }) }),
    }) },
}))
vi.mock('@/modules/features/messaging/channel-resolver', () => ({
    ChannelResolver: { resolveConnection: mocks.resolve },
}))
vi.mock('@/modules/features/messaging/providers/meta-provider', () => ({ MetaProvider: class {} }))
vi.mock('@/modules/features/messaging/webhook-handler', () => ({
    webhookManager: { registerProvider: vi.fn(), handleParsed: mocks.handle },
}))
vi.mock('./webhook-events', () => ({ processMetaControlEvents: mocks.control }))

import { processPersistedMetaWebhook } from './process-persisted-webhook'

const change = { field: 'messages', value: { metadata: { phone_number_id: 'asset-a' }, messages: [{ id: 'message-a' }] } }
beforeEach(() => {
    mocks.read.mockResolvedValue({ data: {
        id: 'event-a', channel: 'whatsapp', processed_at: null,
        payload: { object: 'whatsapp_business_account', entry: [{ id: 'waba-a', changes: [change] }] },
    }, error: null })
    mocks.resolve.mockResolvedValue(null)
    mocks.control.mockResolvedValue(undefined)
    mocks.handle.mockResolvedValue({ success: true })
    mocks.update.mockResolvedValue({ error: null })
})
afterEach(() => vi.clearAllMocks())

describe('persisted Meta webhook processing', () => {
    it('acknowledges an unowned WhatsApp asset without routing it to a tenant', async () => {
        await processPersistedMetaWebhook('event-a')
        const payload = mocks.handle.mock.calls[0][1]
        expect(payload.entry[0].changes).toEqual([])
        expect(mocks.update).toHaveBeenCalledOnce()
    })

    it('preserves an owned asset for the existing message parser', async () => {
        mocks.resolve.mockResolvedValue({ connectionId: 'channel-a', organizationId: 'org-a' })
        await processPersistedMetaWebhook('event-a')
        const payload = mocks.handle.mock.calls[0][1]
        expect(payload.entry[0].changes).toEqual([change])
    })

    it('keeps the event pending if ownership resolution fails', async () => {
        mocks.resolve.mockRejectedValue(new Error('database unavailable'))
        await expect(processPersistedMetaWebhook('event-a')).rejects.toThrow('database unavailable')
        expect(mocks.update).not.toHaveBeenCalled()
    })
})
