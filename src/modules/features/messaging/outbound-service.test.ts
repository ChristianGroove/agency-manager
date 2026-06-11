import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getAdapter: vi.fn(),
    saveOutboundMessage: vi.fn(),
    supabaseFrom: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    },
}))

vi.mock('@/modules/infrastructure/integrations/registry', () => ({
    integrationRegistry: {
        getAdapter: mocks.getAdapter,
    },
}))

vi.mock('./services/persistence', () => ({
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

function conversationMaybeSingleQuery(data: unknown = null) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        neq: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(() => query),
        maybeSingle: vi.fn(async () => ({ data, error: null })),
    }

    return query
}

function conversationSingleQuery(data: unknown = null, error: unknown = null) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => ({ data, error })),
    }

    return query
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.getAdapter.mockReset()
    mocks.saveOutboundMessage.mockReset()
    mocks.supabaseFrom.mockReset()
})

describe('OutboundService', () => {
    it('does not expose outbound recipient, channel, org, or external ids in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const adapterSendMessage = vi.fn(async () => ({ messageId: 'wamid.secret.outbound' }))
        mocks.getAdapter.mockReturnValue({ sendMessage: adapterSendMessage })
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'conversations') return conversationMaybeSingleQuery(null)
            throw new Error(`Unexpected table ${table}`)
        })

        const { OutboundService } = await import('./outbound-service')
        const result = await new OutboundService().sendMessage(
            'channel-secret-id',
            '+571234567890',
            'hola',
            'org-secret-id',
            {
                connection: {
                    id: 'channel-secret-id',
                    provider_key: 'whatsapp_cloud',
                    credentials: { accessToken: 'token-secret' },
                    metadata: {},
                },
            }
        )

        expect(result).toEqual({ messageId: 'wamid.secret.outbound' })
        expect(adapterSendMessage).toHaveBeenCalledWith(
            { accessToken: 'token-secret' },
            '+571234567890',
            'hola',
            expect.objectContaining({ channel: 'whatsapp' })
        )
        expect(mocks.saveOutboundMessage).not.toHaveBeenCalled()

        const logText = collectConsoleCalls(logSpy, warnSpy)
        expect(logText).not.toContain('+571234567890')
        expect(logText).not.toContain('channel-secret-id')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('wamid.secret.outbound')
        expect(logText).toContain('recipientPhonePresent')
        expect(logText).toContain('channelIdPresent')
        expect(logText).toContain('messageIdPresent')
    })

    it('does not expose system conversation ids or raw database errors in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'conversations') {
                return conversationSingleQuery(null, {
                    code: 'PGRST116',
                    message: 'conversation-secret-id raw database failure',
                })
            }
            throw new Error(`Unexpected table ${table}`)
        })

        const { OutboundService } = await import('./outbound-service')
        const result = await new OutboundService().sendSystemMessage('conversation-secret-id', 'hola')

        expect(result).toEqual({ success: false, error: 'System message could not be sent' })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('conversation-secret-id')
        expect(logText).not.toContain('raw database failure')
        expect(logText).toContain('conversationIdPresent')
        expect(logText).toContain('PGRST116')
        expect(logText).toContain('hasMessage')
    })

    it('does not expose system adapter failures in production responses or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const adapterSendMessage = vi.fn(async () => {
            throw new Error('adapter failed token-secret phone-secret-value connection-secret-id')
        })
        mocks.getAdapter.mockReturnValue({ sendMessage: adapterSendMessage })
        const connectionQuery = conversationSingleQuery({
            id: 'connection-secret-id',
            credentials: { accessToken: 'token-secret' },
            metadata: {},
            provider_key: 'whatsapp_cloud',
        })
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'conversations') {
                return conversationSingleQuery({
                    id: 'conversation-secret-id',
                    channel: 'whatsapp',
                    connection_id: 'connection-secret-id',
                    metadata: { phone: 'phone-secret-value' },
                    organization_id: 'org-secret-id',
                    phone: 'phone-secret-value',
                })
            }

            if (table === 'integration_connections') {
                return connectionQuery
            }

            throw new Error(`Unexpected table ${table}`)
        })

        const { OutboundService } = await import('./outbound-service')
        const result = await new OutboundService().sendSystemMessage('conversation-secret-id', 'hola', 'whatsapp', 'connection-secret-id')

        expect(result).toEqual({ success: false, error: 'System message could not be sent' })
        expect(connectionQuery.eq).toHaveBeenCalledWith('id', 'connection-secret-id')
        expect(connectionQuery.eq).toHaveBeenCalledWith('organization_id', 'org-secret-id')
        const logText = collectConsoleCalls(logSpy, errorSpy)
        expect(logText).not.toContain('conversation-secret-id')
        expect(logText).not.toContain('connection-secret-id')
        expect(logText).not.toContain('phone-secret-value')
        expect(logText).not.toContain('token-secret')
        expect(logText).not.toContain('adapter failed')
        expect(logText).toContain('conversationIdPresent')
        expect(logText).toContain('connectionIdPresent')
        expect(logText).toContain('Error')
    })
})
