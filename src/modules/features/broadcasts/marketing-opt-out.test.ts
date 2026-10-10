import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IncomingMessage } from '../messaging/providers/types'
import { isMarketingOptOut, processIncomingMarketingOptOut } from './marketing-opt-out'

const incoming = (overrides: Partial<Omit<IncomingMessage, 'content'>> & { content?: IncomingMessage['content'] | string } = {}) => ({
    channel: 'whatsapp', externalId: 'wamid.fixture', from: '573001234567', content: 'STOP', ...overrides,
}) as IncomingMessage
afterEach(() => vi.restoreAllMocks())

describe('Incoming marketing withdrawal', () => {
    it.each(['STOP', '  ¡No quiero recibir más promociones!  ', 'No me envíen más promociones.', 'Baja', 'unsubscribe'])('recognizes an explicit request: %s', text => {
        expect(isMarketingOptOut(incoming({ content: { type: 'text', text } }))).toBe(true)
    })
    it.each(['no', 'cancelar pedido', 'STOP por ahora mi pedido', 'quiero información'])('preserves ordinary conversation: %s', content => {
        expect(isMarketingOptOut(incoming({ content }))).toBe(false)
    })
    it.each([
        { channel: 'messenger' }, { channel: 'instagram' }, { origin: 'outbound' },
        { metadata: { historical: true } }, { metadata: { is_echo: true } }, { externalId: undefined },
        { content: { type: 'audio', mediaUrl: 'https://pixy.test/audio.ogg' } },
    ] as Partial<IncomingMessage>[])('ignores other channels, echoes, history or media: %j', overrides => {
        expect(isMarketingOptOut(incoming(overrides))).toBe(false)
    })
    it('recognizes the explicit button without using its displayed text', () => {
        expect(isMarketingOptOut(incoming({ content: 'Dejar de recibir', buttonId: 'BAJA_PROMOCIONES' }))).toBe(true)
    })
    it('does no database work for ordinary messages', async () => {
        const rpc = vi.fn()
        await processIncomingMarketingOptOut(incoming({ content: 'Hola' }), 'message', { rpc } as any)
        expect(rpc).not.toHaveBeenCalled()
    })
    it('processes only the persisted request with a bounded RPC', async () => {
        const rpc = vi.fn().mockResolvedValue({ data: { processed: 1, failed: 0 }, error: null })
        await processIncomingMarketingOptOut(incoming(), 'message', { rpc } as any)
        expect(rpc).toHaveBeenCalledWith('process_marketing_opt_out_requests', { p_limit: 1, p_message: 'message' })
    })
    it.each([
        () => Promise.reject(new Error('secret-message-content')),
        () => Promise.resolve({ error: { message: 'secret-message-content' } }),
        () => Promise.resolve({ data: { processed: 0, failed: 1 } }),
    ])('does not fail Inbox processing or expose content on a preference error', async implementation => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        await expect(processIncomingMarketingOptOut(incoming(), 'message', { rpc: vi.fn(implementation) } as any)).resolves.toBeUndefined()
        expect(warn).toHaveBeenCalledWith('[Marketing] Opt-out pending maintenance retry')
    })
})
