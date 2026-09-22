import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(), rpc: vi.fn(), sendEvent: vi.fn(), getAdapter: vi.fn(), assertSend: vi.fn(),
}))
vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: { from: mocks.from, rpc: mocks.rpc },
}))
vi.mock('@/modules/infrastructure/automation/inngest/client', () => ({
    inngest: { send: mocks.sendEvent },
}))
vi.mock('@/modules/infrastructure/integrations/registry', () => ({
    integrationRegistry: { getAdapter: mocks.getAdapter },
}))
vi.mock('@/modules/infrastructure/meta/services/send-policy', () => ({
    assertMetaSendAllowed: mocks.assertSend,
}))

function query(result: any) {
    const builder: any = {
        select: vi.fn(() => builder), eq: vi.fn(() => builder),
        update: vi.fn(() => builder),
        single: vi.fn(async () => result), maybeSingle: vi.fn(async () => result),
    }
    return builder
}

const queued = {
    id: 'outbox-1', organization_id: 'tenant-a', connection_id: 'channel-a',
    conversation_id: 'conversation-a', message_id: 'message-a', recipient: 'recipient-a',
    content: { type: 'text', text: 'hola' }, channel: 'whatsapp', status: 'queued',
}
const connection = {
    id: 'channel-a', organization_id: 'tenant-a', status: 'active',
    provider_key: 'whatsapp_cloud', metadata: { asset_id: 'phone-a' }, credentials: { _private: 'channel-a' },
}

beforeEach(() => {
    vi.clearAllMocks()
    mocks.assertSend.mockResolvedValue(undefined)
    mocks.sendEvent.mockResolvedValue(undefined)
    mocks.rpc.mockResolvedValue({ data: true, error: null })
})

describe('Meta outbound outbox', () => {
    it('persists before dispatching and leaves cron able to recover event failures', async () => {
        mocks.rpc.mockResolvedValueOnce({ data: [{ outbox_id: 'outbox-1', message_id: 'message-a',
            delivery_status: 'queued', external_id: null }], error: null })
        mocks.sendEvent.mockRejectedValueOnce(new Error('Inngest unavailable'))
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const { enqueueMetaOutbound } = await import('./meta-outbox')
        const result = await enqueueMetaOutbound({ organizationId: 'tenant-a', connectionId: 'channel-a',
            conversationId: 'conversation-a', operationKey: 'agent:message-a', messageId: 'message-a',
            recipient: 'recipient-a', content: 'hola', sender: 'Agent', channel: 'whatsapp' })
        expect(result.status).toBe('queued')
        expect(mocks.rpc).toHaveBeenCalledWith('enqueue_meta_outbound', expect.objectContaining({
            p_content: { type: 'text', text: 'hola' }, p_operation_key: 'agent:message-a',
        }))
        expect(mocks.sendEvent).toHaveBeenCalledWith({ name: 'meta/outbound.queued', data: { outboxId: 'outbox-1' } })
        expect(warning).toHaveBeenCalled()
        warning.mockRestore()
    })

    it('claims once and reconciles Graph acceptance with the message', async () => {
        const sendMessage = vi.fn(async () => ({ messageId: 'wamid-a' }))
        mocks.getAdapter.mockReturnValue({ sendMessage })
        mocks.from
            .mockReturnValueOnce(query({ data: queued, error: null }))
            .mockReturnValueOnce(query({ data: connection, error: null }))
            .mockReturnValueOnce(query({ data: { ...queued, status: 'sending' }, error: null }))
            .mockReturnValueOnce(query({ data: { status: 'active' }, error: null }))
            .mockReturnValueOnce(query({ data: { id: 'conversation-a', organization_id: 'tenant-a', connection_id: 'channel-a' }, error: null }))
        const { dispatchMetaOutbound } = await import('./meta-outbox')
        const result = await dispatchMetaOutbound('outbox-1')
        expect(result).toMatchObject({ status: 'accepted', externalId: 'wamid-a' })
        expect(sendMessage).toHaveBeenCalledTimes(1)
        expect(mocks.rpc).toHaveBeenCalledWith('finish_meta_outbound', expect.objectContaining({
            p_status: 'accepted', p_external_id: 'wamid-a',
        }))
    })

    it('does not call Graph again for an operation already claimed', async () => {
        const sendMessage = vi.fn()
        mocks.getAdapter.mockReturnValue({ sendMessage })
        mocks.from.mockReturnValueOnce(query({ data: { ...queued, status: 'sending' }, error: null }))
        const { dispatchMetaOutbound } = await import('./meta-outbox')
        expect((await dispatchMetaOutbound('outbox-1')).status).toBe('sending')
        expect(sendMessage).not.toHaveBeenCalled()
    })

    it('records an ambiguous Graph failure without retrying it', async () => {
        const sendMessage = vi.fn(async () => { throw new Error('request timed out with recipient and token') })
        mocks.getAdapter.mockReturnValue({ sendMessage })
        mocks.from
            .mockReturnValueOnce(query({ data: queued, error: null }))
            .mockReturnValueOnce(query({ data: connection, error: null }))
            .mockReturnValueOnce(query({ data: { ...queued, status: 'sending' }, error: null }))
            .mockReturnValueOnce(query({ data: { status: 'active' }, error: null }))
            .mockReturnValueOnce(query({ data: { id: 'conversation-a' }, error: null }))
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const { dispatchMetaOutbound } = await import('./meta-outbox')
        expect((await dispatchMetaOutbound('outbox-1')).status).toBe('unknown')
        expect(sendMessage).toHaveBeenCalledTimes(1)
        expect(mocks.rpc).toHaveBeenCalledWith('finish_meta_outbound', expect.objectContaining({ p_status: 'unknown' }))
        expect(JSON.stringify(warning.mock.calls)).not.toContain('recipient and token')
        warning.mockRestore()
    })

    it('keeps suspended coexistence sends queued', async () => {
        mocks.from.mockReturnValueOnce(query({ data: queued, error: null }))
            .mockReturnValueOnce(query({ data: { ...connection, status: 'temporarily_offboarded' }, error: null }))
            .mockReturnValueOnce(query({ data: null, error: null }))
        const { dispatchMetaOutbound } = await import('./meta-outbox')
        expect((await dispatchMetaOutbound('outbox-1')).status).toBe('queued')
        expect(mocks.getAdapter).not.toHaveBeenCalled()
    })
})
