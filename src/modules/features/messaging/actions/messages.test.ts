import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    after: vi.fn(),
    createClient: vi.fn(),
    MetaProvider: vi.fn(function () {
        return { sendMessage: vi.fn() }
    }),
    handleIncomingMessage: vi.fn(),
    revalidatePath: vi.fn(),
    saveOutboundMessage: vi.fn(),
    supabaseFrom: vi.fn(),
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('next/server', () => ({
    after: mocks.after,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    },
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('../providers/meta-provider', () => ({
    MetaProvider: mocks.MetaProvider,
}))

vi.mock('../inbox-service', () => ({
    inboxService: {
        handleIncomingMessage: mocks.handleIncomingMessage,
    },
}))

vi.mock('../services/persistence', () => ({
    MessagingPersistence: {
        saveOutboundMessage: mocks.saveOutboundMessage,
    },
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

function updateEqQuery(result: unknown, updateSpy = vi.fn()) {
    const query: any = {
        eq: vi.fn(async () => result),
    }

    return {
        update: updateSpy.mockReturnValue(query),
    }
}

function orderQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        order: vi.fn(async () => result),
        select: vi.fn(() => query),
    }

    return query
}

function singleQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.after.mockReset()
    mocks.createClient.mockReset()
    mocks.handleIncomingMessage.mockReset()
    mocks.MetaProvider.mockReset()
    mocks.MetaProvider.mockImplementation(function () {
        return { sendMessage: vi.fn() }
    })
    mocks.revalidatePath.mockReset()
    mocks.saveOutboundMessage.mockReset()
    mocks.supabaseFrom.mockReset()
})

describe('message actions logging', () => {
    it('does not expose conversation ids or database messages when marking as read fails', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue({
            from: vi.fn((table: string) => {
                if (table === 'conversations') {
                    return updateEqQuery({
                        error: {
                            code: '42501',
                            message: 'policy denied conversation-secret-id for phone-secret-value',
                        },
                    })
                }

                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { markConversationAsRead } = await import('./messages')
        const result = await markConversationAsRead('conversation-secret-id')

        expect(result).toEqual({ success: false })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('conversation-secret-id')
        expect(logText).not.toContain('phone-secret-value')
        expect(logText).not.toContain('policy denied')
        expect(logText).toContain('conversationIdPresent')
        expect(logText).toContain('42501')
        expect(logText).toContain('hasMessage')
    })

    it('does not expose conversation ids or database messages when loading messages fails', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue({
            from: vi.fn((table: string) => {
                if (table === 'messages') {
                    return orderQuery({
                        data: null,
                        error: {
                            code: '42501',
                            message: 'messages denied conversation-secret-id with phone-secret-value',
                        },
                    })
                }

                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { getMessages } = await import('./messages')
        const result = await getMessages('conversation-secret-id')

        expect(result).toEqual([])
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('conversation-secret-id')
        expect(logText).not.toContain('phone-secret-value')
        expect(logText).not.toContain('messages denied')
        expect(logText).toContain('conversationIdPresent')
        expect(logText).toContain('42501')
    })

    it('does not expose outbound send failure details in production responses or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.saveOutboundMessage.mockRejectedValue(new Error('message-secret-id conversation-secret-id meta-token-secret phone-secret-value'))
        mocks.createClient.mockResolvedValue({
            from: vi.fn((table: string) => {
                if (table === 'conversations') {
                    return singleQuery({
                        data: {
                            id: 'conversation-secret-id',
                            connection_id: 'connection-secret-id',
                            organization_id: 'org-secret-id',
                            metadata: { phone: 'phone-secret-value' },
                        },
                        error: null,
                    })
                }

                throw new Error(`Unexpected table ${table}`)
            }),
        })
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'integration_connections') {
                return singleQuery({
                    data: {
                        id: 'connection-secret-id',
                        credentials: {
                            accessToken: 'meta-token-secret',
                            verifyToken: 'verify-token-secret',
                        },
                        external_id: 'phone-number-secret-id',
                        metadata: { asset_id: 'phone-number-secret-id' },
                        provider_key: 'meta_whatsapp',
                    },
                    error: null,
                })
            }

            throw new Error(`Unexpected table ${table}`)
        })

        const { sendMessage } = await import('./messages')
        const result = await sendMessage('conversation-secret-id', { type: 'text', text: 'secret body' }, 'Agent Secret', 'message-secret-id')

        expect(result).toEqual({ success: false, error: 'Message could not be sent' })
        expect(mocks.MetaProvider).toHaveBeenCalledWith('meta-token-secret', 'phone-number-secret-id', 'verify-token-secret')
        expect(mocks.saveOutboundMessage).toHaveBeenCalledWith(expect.objectContaining({
            conversationId: 'conversation-secret-id',
            messageId: 'message-secret-id',
            sender: 'Agent Secret',
        }))

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('conversation-secret-id')
        expect(logText).not.toContain('connection-secret-id')
        expect(logText).not.toContain('message-secret-id')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('meta-token-secret')
        expect(logText).not.toContain('phone-secret-value')
        expect(logText).not.toContain('phone-number-secret-id')
        expect(logText).not.toContain('Agent Secret')
        expect(logText).toContain('conversationIdPresent')
        expect(logText).toContain('messageIdPresent')
        expect(logText).toContain('senderPresent')
    })

    it('does not expose simulated inbound failures in production responses or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.handleIncomingMessage.mockRejectedValue(new Error('phone-secret-value text-secret-value provider denied'))

        const { simulateInboundMessage } = await import('./messages')
        const result = await simulateInboundMessage('phone-secret-value', 'text-secret-value')

        expect(result).toEqual({ success: false, error: 'Failed to handle message' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('phone-secret-value')
        expect(logText).not.toContain('text-secret-value')
        expect(logText).not.toContain('provider denied')
        expect(logText).toContain('fromPresent')
        expect(logText).toContain('Error')
    })
})
