import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    after: vi.fn(),
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    MetaProvider: vi.fn(function () {
        return { sendMessage: vi.fn() }
    }),
    handleIncomingMessage: vi.fn(),
    revalidatePath: vi.fn(),
    saveOutboundMessage: vi.fn(),
    supabaseFrom: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
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

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
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
        eq: vi.fn(() => query),
        then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject),
    }

    return {
        update: updateSpy.mockReturnValue(query),
        __query: query,
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

function authUser() {
    return {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.after.mockReset()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
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
    it('does not mutate or send UI messages without a user session', async () => {
        const from = vi.fn()
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn(async () => ({ data: { user: null } })),
            },
            from,
        })

        const actions = await import('./messages')
        const cases: Array<[string, () => Promise<unknown>]> = [
            ['markConversationAsRead', () => actions.markConversationAsRead('conversation-1')],
            ['sendMessage', () => actions.sendMessage('conversation-1', { type: 'text', text: 'hola' }, 'Agent')],
            ['sendAudioMessage', () => actions.sendAudioMessage('conversation-1', 'https://media.local/audio.ogg', 10, 'Agent')],
            ['sendImageMessage', () => actions.sendImageMessage('conversation-1', 'https://media.local/image.png', undefined, 'Agent')],
            ['sendLocationMessage', () => actions.sendLocationMessage('conversation-1', 4.65, -74.05, undefined, 'Agent')],
            ['retryMessage', () => actions.retryMessage('message-1')],
            ['sendProductCardMessage', () => actions.sendProductCardMessage('conversation-1', { name: 'Producto', base_price: 1 }, 'Agent')],
        ]

        for (const [name, runAction] of cases) {
            await expect(runAction(), name).resolves.toEqual({ success: false, error: 'Unauthorized' })
        }
        expect(from).not.toHaveBeenCalled()
        expect(mocks.supabaseFrom).not.toHaveBeenCalled()
        expect(mocks.saveOutboundMessage).not.toHaveBeenCalled()
        expect(mocks.after).not.toHaveBeenCalled()
    })

    it('does not load messages without a user session', async () => {
        const from = vi.fn()
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn(async () => ({ data: { user: null } })),
            },
            from,
        })

        const { getMessages } = await import('./messages')
        const result = await getMessages('conversation-1')

        expect(result).toEqual([])
        expect(from).not.toHaveBeenCalled()
    })

    it('does not send UI messages without an active organization', async () => {
        const from = vi.fn()
        mocks.getCurrentOrganizationId.mockResolvedValue(null)
        mocks.createClient.mockResolvedValue({
            auth: authUser(),
            from,
        })

        const { sendMessage } = await import('./messages')
        const result = await sendMessage('conversation-1', { type: 'text', text: 'hola' }, 'Agent')

        expect(result).toEqual({ success: false, error: 'Unauthorized' })
        expect(from).not.toHaveBeenCalled()
        expect(mocks.supabaseFrom).not.toHaveBeenCalled()
        expect(mocks.saveOutboundMessage).not.toHaveBeenCalled()
        expect(mocks.after).not.toHaveBeenCalled()
    })

    it('does not expose conversation ids or database messages when marking as read fails', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const conversationsQuery = updateEqQuery({
            error: {
                code: '42501',
                message: 'policy denied conversation-secret-id for phone-secret-value',
            },
        })
        mocks.createClient.mockResolvedValue({
            auth: authUser(),
            from: vi.fn((table: string) => {
                if (table === 'conversations') {
                    return conversationsQuery
                }

                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { markConversationAsRead } = await import('./messages')
        const result = await markConversationAsRead('conversation-secret-id')

        expect(result).toEqual({ success: false })
        expect(conversationsQuery.__query.eq).toHaveBeenCalledWith('id', 'conversation-secret-id')
        expect(conversationsQuery.__query.eq).toHaveBeenCalledWith('organization_id', 'org-current')
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
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const messagesQuery = orderQuery({
            data: null,
            error: {
                code: '42501',
                message: 'messages denied conversation-secret-id with phone-secret-value',
            },
        })
        mocks.createClient.mockResolvedValue({
            auth: authUser(),
            from: vi.fn((table: string) => {
                if (table === 'messages') {
                    return messagesQuery
                }

                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { getMessages } = await import('./messages')
        const result = await getMessages('conversation-secret-id')

        expect(result).toEqual([])
        expect(messagesQuery.eq).toHaveBeenCalledWith('conversation_id', 'conversation-secret-id')
        expect(messagesQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
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
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        mocks.saveOutboundMessage.mockRejectedValue(new Error('message-secret-id conversation-secret-id meta-token-secret phone-secret-value'))
        mocks.createClient.mockResolvedValue({
            auth: authUser(),
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

    it('scopes UI outbound sends and provider status updates to the current organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const providerSend = vi.fn(async () => ({ success: true, messageId: 'wamid-current' }))
        mocks.MetaProvider.mockImplementation(function () {
            return { sendMessage: providerSend }
        })

        const conversationQuery = singleQuery({
            data: {
                id: 'conversation-current',
                connection_id: 'connection-current',
                organization_id: 'org-current',
                metadata: { phone: 'phone-current' },
            },
            error: null,
        })
        const connectionQuery = singleQuery({
            data: {
                id: 'connection-current',
                credentials: {
                    accessToken: 'token-current',
                    verifyToken: 'verify-current',
                },
                external_id: 'asset-current',
                metadata: { asset_id: 'asset-current' },
                provider_key: 'meta_whatsapp',
            },
            error: null,
        })
        const updateQuery = updateEqQuery({ error: null })

        mocks.createClient.mockResolvedValue({
            auth: authUser(),
            from: vi.fn((table: string) => {
                if (table === 'conversations') return conversationQuery
                throw new Error(`Unexpected table ${table}`)
            }),
        })
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'integration_connections') return connectionQuery
            if (table === 'messages') return updateQuery
            throw new Error(`Unexpected table ${table}`)
        })

        const { sendMessage } = await import('./messages')
        const result = await sendMessage('conversation-current', { type: 'text', text: 'Hola' }, 'Agent', 'message-current')

        expect(result).toEqual({ success: true, messageId: 'message-current' })
        expect(conversationQuery.eq).toHaveBeenCalledWith('id', 'conversation-current')
        expect(conversationQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(connectionQuery.eq).toHaveBeenCalledWith('id', 'connection-current')
        expect(connectionQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.saveOutboundMessage).toHaveBeenCalledWith(expect.objectContaining({
            conversationId: 'conversation-current',
            messageId: 'message-current',
            organizationId: 'org-current',
        }))

        const runAfter = mocks.after.mock.calls[0]?.[0]
        expect(runAfter).toEqual(expect.any(Function))
        await runAfter()

        expect(providerSend).toHaveBeenCalledWith(expect.objectContaining({
            to: 'phone-current',
            metadata: expect.objectContaining({ organizationId: 'org-current' }),
        }))
        expect(updateQuery.update).toHaveBeenCalledWith({ external_id: 'wamid-current', status: 'sent' })
        expect(updateQuery.__query.eq).toHaveBeenCalledWith('id', 'message-current')
        expect(updateQuery.__query.eq).toHaveBeenCalledWith('conversation_id', 'conversation-current')
        expect(updateQuery.__query.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('does not load channel credentials outside the conversation organization', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const conversationQuery = singleQuery({
            data: {
                id: 'conversation-current',
                connection_id: 'connection-other-org',
                organization_id: 'org-current',
                metadata: { phone: 'phone-current' },
            },
            error: null,
        })
        const connectionQuery = singleQuery({ data: null, error: null })
        mocks.createClient.mockResolvedValue({
            auth: authUser(),
            from: vi.fn((table: string) => {
                if (table === 'conversations') return conversationQuery

                throw new Error(`Unexpected table ${table}`)
            }),
        })
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'integration_connections') return connectionQuery
            throw new Error(`Unexpected table ${table}`)
        })

        const { sendMessage } = await import('./messages')
        const result = await sendMessage('conversation-current', { type: 'text', text: 'Hola' }, 'Agent', 'message-current')

        expect(result).toEqual({ success: false, error: 'Message could not be sent' })
        expect(conversationQuery.eq).toHaveBeenCalledWith('id', 'conversation-current')
        expect(conversationQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(connectionQuery.eq).toHaveBeenCalledWith('id', 'connection-other-org')
        expect(connectionQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.saveOutboundMessage).not.toHaveBeenCalled()
        expect(mocks.MetaProvider).not.toHaveBeenCalled()
        expect(mocks.after).not.toHaveBeenCalled()
    })

    it('scopes retry message reads and status resets to the current organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const retryMessageQuery = singleQuery({
            data: {
                id: 'message-current',
                conversation_id: 'conversation-current',
                content: { type: 'text', text: 'Hola' },
                metadata: { error: 'old failure' },
                sender_id: 'Agent',
            },
            error: null,
        })
        const resetMessageQuery = updateEqQuery({ error: null })
        const conversationQuery = singleQuery({
            data: {
                id: 'conversation-current',
                connection_id: 'connection-current',
                metadata: { phone: 'phone-current' },
                organization_id: 'org-current',
            },
            error: null,
        })
        const connectionQuery = singleQuery({
            data: {
                id: 'connection-current',
                credentials: {
                    accessToken: 'token-current',
                    verifyToken: 'verify-current',
                },
                external_id: 'asset-current',
                metadata: { asset_id: 'asset-current' },
                provider_key: 'meta_whatsapp',
            },
            error: null,
        })
        let messageCalls = 0
        mocks.createClient.mockResolvedValue({
            auth: authUser(),
            from: vi.fn((table: string) => {
                if (table === 'messages') {
                    messageCalls++
                    return messageCalls === 1 ? retryMessageQuery : resetMessageQuery
                }
                if (table === 'conversations') return conversationQuery
                throw new Error(`Unexpected table ${table}`)
            }),
        })
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'integration_connections') return connectionQuery
            throw new Error(`Unexpected table ${table}`)
        })

        const { retryMessage } = await import('./messages')
        const result = await retryMessage('message-current')

        expect(result).toEqual({ success: true, messageId: 'message-current' })
        expect(retryMessageQuery.eq).toHaveBeenCalledWith('id', 'message-current')
        expect(retryMessageQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(resetMessageQuery.__query.eq).toHaveBeenCalledWith('id', 'message-current')
        expect(resetMessageQuery.__query.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(conversationQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(connectionQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.after).toHaveBeenCalled()
    })

    it('blocks simulated inbound messages in production', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const { simulateInboundMessage } = await import('./messages')
        const result = await simulateInboundMessage('phone-secret-value', 'text-secret-value')

        expect(result).toEqual({ success: false, error: 'Failed to handle message' })
        expect(mocks.createClient).not.toHaveBeenCalled()
        expect(mocks.handleIncomingMessage).not.toHaveBeenCalled()
    })

    it('blocks simulated inbound messages without a user session', async () => {
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn(async () => ({ data: { user: null } })),
            },
        })

        const { simulateInboundMessage } = await import('./messages')
        const result = await simulateInboundMessage('phone-secret-value', 'text-secret-value')

        expect(result).toEqual({ success: false, error: 'Unauthorized' })
        expect(mocks.handleIncomingMessage).not.toHaveBeenCalled()
    })

    it('does not expose simulated inbound failures in action responses or logs', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
            },
        })
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
