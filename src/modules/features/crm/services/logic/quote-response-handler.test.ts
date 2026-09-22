import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
    const sendMessage = vi.fn()

    return {
        sendMessage,
        supabaseFrom: vi.fn(),
    }
})

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    }
}))

vi.mock('@/modules/features/messaging/outbound-service', () => ({
    outboundService: { sendMessage: mocks.sendMessage },
}))

function collectConsoleCalls(...spies: ReturnType<typeof vi.spyOn>[]) {
    return spies
        .flatMap(spy => spy.mock.calls as unknown[][])
        .map(call => call.map(value => {
            if (typeof value === 'string') return value
            if (value instanceof Error) return `${value.name}: ${value.message}`
            try {
                return JSON.stringify(value)
            } catch {
                return String(value)
            }
        }).join(' '))
        .join('\n')
}

function useSupabaseQueues(queues: Record<string, any[]>) {
    mocks.supabaseFrom.mockImplementation((table: string) => {
        const queue = queues[table]
        if (!queue?.length) throw new Error(`Unexpected table ${table}`)
        return queue.shift()
    })
}

function singleQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        limit: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function updateEq(result: unknown) {
    const query: any = {
        eq: vi.fn(async () => result),
    }

    return {
        update: vi.fn(() => query),
    }
}

function updateEqThrow(error: unknown) {
    const query: any = {
        eq: vi.fn(async () => {
            throw error
        }),
    }

    return {
        update: vi.fn(() => query),
    }
}

function quoteSettings(data: unknown = {
    actions_config: {
        reject: {
            reasons: ['Too expensive'],
        },
    },
}) {
    return singleQuery({ data, error: null })
}

const context = {
    conversationId: 'conversation-secret-id',
    cartId: 'cart-secret-id',
    connectionId: 'connection-secret-id',
    recipientPhone: '+573001112233',
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.sendMessage.mockReset()
    mocks.supabaseFrom.mockReset()
})

describe('quote response handler logging and failures', () => {
    it('does not expose quote approval failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        useSupabaseQueues({
            deal_carts: [updateEqThrow(new Error('approval denied for cart-secret-id with db-token-secret'))],
        })

        const { handleQuoteApproval } = await import('./quote-response-handler')
        const result = await handleQuoteApproval(context)

        expect(result).toEqual({ success: false, error: 'No se pudo aprobar la cotizacion' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('cart-secret-id')
        expect(logText).not.toContain('db-token-secret')
        expect(logText).not.toContain('approval denied')
        expect(logText).toContain('Error')
    })

    it('does not expose quote settings lookup details while keeping rejection flow usable', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.sendMessage.mockResolvedValue({ messageId: 'wamid.secret.quote' })
        useSupabaseQueues({
            conversations: [
                singleQuery({ data: { id: context.conversationId, phone: context.recipientPhone, organization_id: 'org-secret-id', connection_id: context.connectionId }, error: null }),
            ],
            quote_settings: [
                singleQuery({
                    data: null,
                    error: {
                        code: '42501',
                        message: 'settings denied for org-secret-id using policy-secret',
                    },
                }),
            ],
        })

        const { handleQuoteRejection } = await import('./quote-response-handler')
        const result = await handleQuoteRejection(context)

        expect(result).toEqual({ success: true })
        expect(mocks.sendMessage).toHaveBeenCalledWith(
            context.connectionId, context.recipientPhone,
            expect.objectContaining({ type: 'interactive_list' }), 'org-secret-id',
            expect.objectContaining({ sender: 'System' }),
        )

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('policy-secret')
        expect(logText).not.toContain('settings denied')
        expect(logText).toContain('42501')
    })

    it('does not expose Meta send failures in quote rejection responses or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.sendMessage.mockRejectedValue(new Error('Graph rejected +573001112233 with meta-token-secret for phone-number-secret-id'))
        useSupabaseQueues({
            conversations: [
                singleQuery({ data: { id: context.conversationId, phone: context.recipientPhone, organization_id: 'org-secret-id', connection_id: context.connectionId }, error: null }),
            ],
            quote_settings: [
                quoteSettings(),
            ],
        })

        const { handleQuoteRejection } = await import('./quote-response-handler')
        const result = await handleQuoteRejection(context)

        expect(result).toEqual({ success: false, error: 'No se pudo procesar el rechazo de la cotizacion' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('+573001112233')
        expect(logText).not.toContain('meta-token-secret')
        expect(logText).not.toContain('phone-number-secret-id')
        expect(logText).not.toContain('Graph rejected')
        expect(logText).toContain('Error')
        expect(mocks.sendMessage).toHaveBeenCalledTimes(1)
    })

    it('rejects a quote callback bound to a different channel without sending', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        useSupabaseQueues({
            conversations: [
                singleQuery({ data: { id: context.conversationId, organization_id: 'org-secret-id', connection_id: 'different-channel' }, error: null }),
            ],
            quote_settings: [
                quoteSettings(),
            ],
        })

        const { handleQuoteRejection } = await import('./quote-response-handler')
        const result = await handleQuoteRejection(context)

        expect(result).toEqual({ success: false, error: 'No se pudo procesar el rechazo de la cotizacion' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('connection-secret-id')
        expect(logText).not.toContain('token-secret')
        expect(mocks.sendMessage).not.toHaveBeenCalled()
        expect(logText).toContain('Error')
    })

    it('does not expose rejection reason failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        useSupabaseQueues({
            deal_carts: [updateEqThrow(new Error('reason update denied for cart-secret-id with db-token-secret'))],
        })

        const { handleRejectionReasonSelected } = await import('./quote-response-handler')
        const result = await handleRejectionReasonSelected('cart-secret-id', 'secret reason body', 'conversation-secret-id')

        expect(result).toEqual({ success: false, error: 'No se pudo guardar la razon de rechazo' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('cart-secret-id')
        expect(logText).not.toContain('secret reason body')
        expect(logText).not.toContain('db-token-secret')
        expect(logText).not.toContain('reason update denied')
        expect(logText).toContain('Error')
    })

    it('sends a rejection acknowledgment only through the conversation channel', async () => {
        const update: any = { eq: vi.fn(), select: vi.fn(), single: vi.fn(async () => ({
            data: { id: context.cartId }, error: null,
        })) }
        update.eq.mockReturnValue(update)
        update.select.mockReturnValue(update)
        mocks.sendMessage.mockResolvedValue({ messageId: 'wamid.ack' })
        useSupabaseQueues({
            conversations: [singleQuery({ data: {
                id: context.conversationId, phone: context.recipientPhone,
                organization_id: 'org-secret-id', connection_id: context.connectionId,
            }, error: null })],
            deal_carts: [{ update: vi.fn(() => update) }],
            quote_settings: [quoteSettings({ actions_config: { reject: {
                acknowledgment_message: 'Recibimos: ${reason}',
            } } })],
        })
        const { handleRejectionReasonSelected } = await import('./quote-response-handler')
        expect(await handleRejectionReasonSelected(context.cartId, 'precio', context.conversationId))
            .toEqual({ success: true })
        expect(mocks.sendMessage).toHaveBeenCalledWith(
            context.connectionId, context.recipientPhone,
            { type: 'text', text: 'Recibimos: precio' }, 'org-secret-id',
            expect.objectContaining({ sender: 'System' }),
        )
    })
})
