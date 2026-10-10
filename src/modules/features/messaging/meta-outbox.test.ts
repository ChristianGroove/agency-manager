import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(), rpc: vi.fn(), sendEvent: vi.fn(), getAdapter: vi.fn(), assertSend: vi.fn(),
    signedUrl: vi.fn(),
}))
vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: { from: mocks.from, rpc: mocks.rpc,
        storage: { from: () => ({ createSignedUrl: mocks.signedUrl }) } },
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
    vi.resetAllMocks()
    vi.stubEnv('MARKETING_EXECUTION_ENABLED', 'true')
    mocks.assertSend.mockResolvedValue(undefined)
    mocks.sendEvent.mockResolvedValue(undefined)
    mocks.rpc.mockResolvedValue({ data: true, error: null })
    mocks.signedUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.test/signed/image' }, error: null })
})
afterEach(() => vi.unstubAllEnvs())

describe('Meta outbound outbox', () => {
    it('keeps campaign recovery disabled without changing other operation types', async () => {
        vi.stubEnv('MARKETING_EXECUTION_ENABLED', '')
        mocks.from.mockReturnValueOnce(query({ data: { ...queued, operation_key: 'campaign:e:s' }, error: null }))
            .mockReturnValueOnce(query({ data: null, error: null }))
        const { dispatchMetaOutbound } = await import('./meta-outbox')
        expect((await dispatchMetaOutbound('outbox-1')).status).toBe('queued')
        expect(mocks.rpc).not.toHaveBeenCalled()
        expect(mocks.getAdapter).not.toHaveBeenCalled()
    })
    it('does not bypass the pacing deadline during campaign recovery', async () => {
        mocks.from.mockReturnValueOnce(query({ data: { ...queued, operation_key: 'campaign:e:s', available_at: new Date(Date.now() + 60_000).toISOString() }, error: null }))
        const { dispatchMetaOutbound } = await import('./meta-outbox')
        expect((await dispatchMetaOutbound('outbox-1')).status).toBe('queued')
        expect(mocks.rpc).not.toHaveBeenCalled()
        expect(mocks.getAdapter).not.toHaveBeenCalled()
    })
    it.each(['reserved', 'waiting', 'unavailable'])('reserves the number immediately before campaign emission: %s', async state => {
        const campaign = { ...queued, operation_key: 'campaign:e:s' }
        const sendMessage = vi.fn(async () => ({ messageId: 'wamid-campaign' }))
        mocks.getAdapter.mockReturnValue({ sendMessage })
        const retryAt = new Date(Date.now() + 30_000).toISOString()
        mocks.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce(state === 'unavailable'
            ? { data: null, error: { message: 'database unavailable' } }
            : { data: { allowed: state === 'reserved', retryAt }, error: null })
        const deferred = query({ data: null, error: null })
        mocks.from.mockReturnValueOnce(query({ data: campaign, error: null }))
            .mockReturnValueOnce(query({ data: connection, error: null }))
            .mockReturnValueOnce(query({ data: { ...campaign, status: 'sending' }, error: null }))
            .mockReturnValueOnce(query({ data: { status: 'active' }, error: null }))
            .mockReturnValueOnce(query({ data: { id: 'conversation-a' }, error: null })).mockReturnValueOnce(deferred)
        const { dispatchMetaOutbound } = await import('./meta-outbox')
        expect((await dispatchMetaOutbound('outbox-1')).status).toBe(state === 'reserved' ? 'accepted' : 'queued')
        expect(mocks.rpc).toHaveBeenCalledWith('reserve_marketing_dispatch', {
            p_org: 'tenant-a', p_connection: 'channel-a', p_operation: 'campaign:e:s', p_outbox: 'outbox-1',
        })
        expect(sendMessage).toHaveBeenCalledTimes(state === 'reserved' ? 1 : 0)
        if (state === 'waiting') expect(deferred.update).toHaveBeenCalledWith({ status: 'queued', claimed_at: null, available_at: retryAt })
    })
    it('does not recover a queued campaign operation when its campaign is paused', async () => {
        const sendMessage = vi.fn()
        mocks.getAdapter.mockReturnValue({ sendMessage })
        const deferred = query({ data: null, error: null })
        mocks.rpc.mockResolvedValueOnce({ data: false, error: null })
        mocks.from.mockReturnValueOnce(query({ data: { ...queued, operation_key: 'campaign:enrollment-a:step-a' }, error: null }))
            .mockReturnValueOnce(deferred)
        const { dispatchMetaOutbound } = await import('./meta-outbox')
        expect((await dispatchMetaOutbound('outbox-1')).status).toBe('queued')
        expect(mocks.rpc).toHaveBeenCalledWith('marketing_outbound_allowed', expect.objectContaining({p_org:'tenant-a',p_connection:'channel-a'}))
        expect(sendMessage).not.toHaveBeenCalled()
        expect(mocks.assertSend).not.toHaveBeenCalled()
    })

    it('fails closed when campaign permission cannot be checked', async () => {
        mocks.rpc.mockResolvedValueOnce({ data: null, error: {message:'database unavailable'} })
        mocks.from.mockReturnValueOnce(query({ data: { ...queued, operation_key: 'campaign:enrollment-a:step-a' }, error: null }))
        const { dispatchMetaOutbound } = await import('./meta-outbox')
        await expect(dispatchMetaOutbound('outbox-1')).rejects.toThrow('marketing dispatch')
        expect(mocks.getAdapter).not.toHaveBeenCalled()
    })
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

    it('gives Meta a short-lived download URL for a private social attachment', async () => {
        const sendMessage = vi.fn(async () => ({ messageId: 'mid-social' }))
        mocks.getAdapter.mockReturnValue({ sendMessage })
        const social = { ...queued, channel: 'messenger', content: {
            type: 'image', mediaUrl: '/api/media/chat/tenant-a/conversation-a/image.png',
        } }
        mocks.from.mockReturnValueOnce(query({ data: social, error: null }))
            .mockReturnValueOnce(query({ data: { ...connection, provider_key: 'facebook_page' }, error: null }))
            .mockReturnValueOnce(query({ data: { ...social, status: 'sending' }, error: null }))
            .mockReturnValueOnce(query({ data: { status: 'active' }, error: null }))
            .mockReturnValueOnce(query({ data: { id: 'conversation-a', organization_id: 'tenant-a', connection_id: 'channel-a' }, error: null }))
        const { dispatchMetaOutbound } = await import('./meta-outbox')
        expect((await dispatchMetaOutbound('outbox-1')).status).toBe('accepted')
        expect(mocks.signedUrl).toHaveBeenCalledWith('tenant-a/conversation-a/image.png', 3600)
        expect(sendMessage).toHaveBeenCalledWith(connection.credentials, 'recipient-a', expect.objectContaining({
            mediaUrl: 'https://storage.test/signed/image',
        }), expect.objectContaining({ channel: 'messenger' }))
    })
})
