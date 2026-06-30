import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
    const sendMessage = vi.fn()

    return {
        decryptObject: vi.fn((value: unknown) => value),
        MetaProvider: vi.fn(function () {
            return { sendMessage }
        }),
        saveOutboundMessage: vi.fn(),
        sendMessage,
        supabaseFrom: vi.fn(),
    }
})

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    }
}))

vi.mock('@/modules/features/messaging/providers/meta-provider', () => ({
    MetaProvider: mocks.MetaProvider,
}))

vi.mock('@/modules/features/messaging/services/persistence', () => ({
    MessagingPersistence: {
        saveOutboundMessage: mocks.saveOutboundMessage,
    },
}))

vi.mock('@/modules/infrastructure/integrations/encryption', () => ({
    decryptObject: mocks.decryptObject,
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

function limitQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        select: vi.fn(() => query),
        limit: vi.fn(async () => result),
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

function connectionQuery() {
    return singleQuery({
        data: {
            id: 'connection-secret-id',
            credentials: {
                accessToken: 'meta-token-secret',
                phoneNumberId: 'phone-number-secret-id',
            },
            metadata: {
                asset_id: 'phone-number-secret-id',
            },
        },
        error: null,
    })
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
    mocks.decryptObject.mockReset()
    mocks.decryptObject.mockImplementation((value: unknown) => value)
    mocks.MetaProvider.mockReset()
    mocks.MetaProvider.mockImplementation(function () {
        return { sendMessage: mocks.sendMessage }
    })
    mocks.saveOutboundMessage.mockReset()
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
        mocks.sendMessage.mockResolvedValue({ success: true, messageId: 'wamid.secret.quote' })
        mocks.saveOutboundMessage.mockResolvedValue({ success: true })
        useSupabaseQueues({
            conversations: [
                singleQuery({ data: { organization_id: 'org-secret-id' }, error: null }),
            ],
            quote_settings: [
                singleQuery({
                    data: null,
                    error: {
                        code: '42501',
                        message: 'settings denied for org-secret-id using policy-secret',
                    },
                }),
                quoteSettings(null),
            ],
            integration_connections: [
                connectionQuery(),
            ],
        })

        const { handleQuoteRejection } = await import('./quote-response-handler')
        const result = await handleQuoteRejection(context)

        expect(result).toEqual({ success: true })
        expect(mocks.MetaProvider).toHaveBeenCalledWith('meta-token-secret', 'phone-number-secret-id', '')
        expect(mocks.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
            to: '+573001112233',
        }))
        expect(mocks.saveOutboundMessage).toHaveBeenCalledWith(expect.objectContaining({
            conversationId: 'conversation-secret-id',
            messageId: 'wamid.secret.quote',
        }))

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('policy-secret')
        expect(logText).not.toContain('settings denied')
        expect(logText).toContain('42501')
    })

    it('does not expose Meta send failures in quote rejection responses or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.sendMessage.mockResolvedValue({
            success: false,
            error: 'Graph rejected +573001112233 with meta-token-secret for phone-number-secret-id',
        })
        useSupabaseQueues({
            conversations: [
                singleQuery({ data: { organization_id: 'org-secret-id' }, error: null }),
            ],
            quote_settings: [
                quoteSettings(),
            ],
            integration_connections: [
                connectionQuery(),
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
        expect(mocks.saveOutboundMessage).not.toHaveBeenCalled()
    })

    it('does not expose fallback connection query failures in quote rejection responses or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        useSupabaseQueues({
            conversations: [
                singleQuery({ data: { organization_id: 'org-secret-id' }, error: null }),
            ],
            quote_settings: [
                quoteSettings(),
            ],
            integration_connections: [
                singleQuery({ data: null, error: null }),
                limitQuery({
                    data: null,
                    error: {
                        code: '42501',
                        message: 'fallback connection denied connection-secret-id with token-secret',
                    },
                }),
            ],
        })

        const { handleQuoteRejection } = await import('./quote-response-handler')
        const result = await handleQuoteRejection(context)

        expect(result).toEqual({ success: false, error: 'No se pudo procesar el rechazo de la cotizacion' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('connection-secret-id')
        expect(logText).not.toContain('token-secret')
        expect(logText).not.toContain('fallback connection denied')
        expect(logText).toContain('42501')
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
})
