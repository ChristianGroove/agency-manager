import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    decryptObject: vi.fn((value: unknown) => value),
    supabaseFrom: vi.fn(),
}))

vi.mock('@/modules/infrastructure/integrations/encryption', () => ({
    decryptObject: mocks.decryptObject,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
        storage: {
            from: vi.fn(),
        },
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

function integrationConnectionsQuery() {
    const query: any = {
        select: vi.fn(() => query),
        in: vi.fn(() => query),
        eq: vi.fn(async () => ({
            data: [{
                credentials: {
                    accessToken: 'db-token-secret',
                    phoneNumberId: 'phone_secret_id',
                },
                metadata: {
                    asset_id: 'phone_secret_id',
                },
                provider_key: 'meta_whatsapp',
            }],
            error: null,
        })),
    }

    return query
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.decryptObject.mockReset()
    mocks.decryptObject.mockImplementation((value: unknown) => value)
    mocks.supabaseFrom.mockReset()
})

describe('MetaProvider', () => {
    it('does not expose media ids, asset ids, or token failures in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'integration_connections') return integrationConnectionsQuery()
            throw new Error(`Unexpected table ${table}`)
        })

        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            error: {
                message: 'media token secret-value failed for media_secret_id',
                type: 'OAuthException',
                code: 190,
            },
        }), { status: 400 }))
        vi.stubGlobal('fetch', fetchMock)

        const { MetaProvider } = await import('./meta-provider')
        const provider = new MetaProvider('constructor-token-secret', 'phone_secret_id', 'verify-token')

        const messages = await provider.parseWebhook({
            object: 'whatsapp_business_account',
            entry: [{
                changes: [{
                    value: {
                        metadata: { phone_number_id: 'phone_secret_id' },
                        contacts: [{ wa_id: '+1555secret', profile: { name: 'Client' } }],
                        messages: [{
                            id: 'wamid.secret',
                            from: '+1555secret',
                            timestamp: '1710000000',
                            type: 'image',
                            image: {
                                id: 'media_secret_id',
                                mime_type: 'image/jpeg',
                                caption: 'photo',
                            },
                        }],
                    },
                }],
            }],
        })

        expect(messages).toHaveLength(1)
        expect('content' in messages[0] ? messages[0].content.mediaUrl : null).toBe('')
        expect(fetchMock).toHaveBeenCalledWith(
            'https://graph.facebook.com/v24.0/media_secret_id',
            expect.objectContaining({
                headers: { Authorization: 'Bearer db-token-secret' },
            })
        )

        const logText = collectConsoleCalls(logSpy, warnSpy, errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('media_secret_id')
        expect(logText).not.toContain('phone_secret_id')
        expect(logText).not.toContain('db-token-secret')
        expect(logText).not.toContain('constructor-token-secret')
        expect(logText).not.toContain('+1555secret')
    })

    it('does not expose WhatsApp echo message ids in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

        const { MetaProvider } = await import('./meta-provider')
        const provider = new MetaProvider('constructor-token-secret', 'phone_secret_id', 'verify-token')

        const messages = await provider.parseWebhook({
            object: 'whatsapp_business_account',
            entry: [{
                changes: [{
                    value: {
                        metadata: { phone_number_id: 'phone_secret_id' },
                        messages: [{
                            id: 'wamid.secret.echo',
                            from: 'phone_secret_id',
                            timestamp: '1710000000',
                            type: 'text',
                            text: { body: 'sent by business' },
                        }],
                    },
                }],
            }],
        })

        expect(messages).toHaveLength(1)
        expect(messages[0]).toEqual(expect.objectContaining({
            origin: 'outbound',
        }))

        const logText = collectConsoleCalls(logSpy)
        expect(logText).not.toContain('wamid.secret.echo')
        expect(logText).not.toContain('phone_secret_id')
        expect(logText).toContain('messageIdPresent')
    })
})
