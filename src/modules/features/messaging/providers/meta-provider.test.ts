import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    decryptObject: vi.fn((value: unknown) => value),
    supabaseFrom: vi.fn(),
}))

vi.mock('@/modules/infrastructure/integrations/encryption', () => ({
    decryptObject: mocks.decryptObject,
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mocks.supabaseFrom,
        storage: {
            from: vi.fn(),
        },
    }))
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

function integrationConnectionsQuery(result: { data: any; error: any }) {
    const query: any = {
        select: vi.fn(() => query),
        in: vi.fn(() => query),
        eq: vi.fn(() => query),
        maybeSingle: vi.fn(async () => result),
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
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
    it('does not download webhook media when two tenants claim the same phone', async () => {
        const direct = { id: 'modern', organization_id: 'tenant-a', provider_key: 'whatsapp_cloud',
            metadata: { asset_id: 'phone-1' }, credentials: { access_token: 'tenant-a-token' } }
        const legacy = { id: 'legacy', organization_id: 'tenant-b', provider_key: 'meta_business',
            metadata: { selected_assets: [{ id: 'phone-1', type: 'whatsapp' }] }, credentials: { access_token: 'tenant-b-token' } }
        mocks.supabaseFrom
            .mockReturnValueOnce(integrationConnectionsQuery({ data: direct, error: null }))
            .mockReturnValueOnce(integrationConnectionsQuery({ data: [legacy], error: null }))
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        vi.spyOn(console, 'error').mockImplementation(() => undefined)

        const { MetaProvider } = await import('./meta-provider')
        const provider = new MetaProvider('constructor-global-token', '', '')
        const messages = await provider.parseWebhook({ entry: [{ changes: [{ value: {
            metadata: { phone_number_id: 'phone-1' },
            messages: [{ id: 'wamid-1', from: 'customer-1', timestamp: '1710000000', type: 'image',
                image: { id: 'media-1', mime_type: 'image/jpeg' } }],
        } }] }] })

        expect(messages).toHaveLength(1)
        expect('content' in messages[0] ? messages[0].content.mediaUrl : null).toBe('')
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('does not expose media ids, asset ids, or token failures in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const direct = { id: 'modern', organization_id: 'tenant-a', provider_key: 'whatsapp_cloud',
            metadata: { asset_id: 'phone_secret_id' }, credentials: { accessToken: 'db-token-secret' } }
        mocks.supabaseFrom
            .mockReturnValueOnce(integrationConnectionsQuery({ data: direct, error: null }))
            .mockReturnValueOnce(integrationConnectionsQuery({ data: [], error: null }))

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
                        message_echoes: [{
                            id: 'wamid.secret.echo',
                            from: '15551230000', to: '15551239999',
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

    it('returns generic WhatsApp send failures in production', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            error: {
                message: 'Graph rejected +1555secret with active-token-secret for phone_secret_id',
                type: 'OAuthException',
                code: 190,
                error_subcode: 460,
            },
        }), { status: 400 }))
        vi.stubGlobal('fetch', fetchMock)

        const { MetaProvider } = await import('./meta-provider')
        const provider = new MetaProvider('constructor-token-secret', 'phone_secret_id', 'verify-token')

        const result = await provider.sendMessage({
            to: '+1555secret',
            content: { type: 'text', text: 'hello' },
            metadata: { channel: 'whatsapp' },
            credentials: {
                accessToken: 'active-token-secret',
                phoneNumberId: 'phone_secret_id',
            },
        })

        expect(result).toEqual({
            success: false,
            error: 'WhatsApp message could not be sent',
        })
        expect(fetchMock).toHaveBeenCalledWith(
            'https://graph.facebook.com/v21.0/phone_secret_id/messages',
            expect.any(Object)
        )

        const logText = collectConsoleCalls(logSpy, errorSpy)
        expect(logText).not.toContain('+1555secret')
        expect(logText).not.toContain('active-token-secret')
        expect(logText).not.toContain('constructor-token-secret')
        expect(logText).not.toContain('phone_secret_id')
    })

    it('returns generic social send failures in production', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            error: {
                message: 'Graph rejected psid_secret with page-token-secret for page_secret_id',
                type: 'GraphMethodException',
                code: 100,
            },
        }), { status: 400 }))
        vi.stubGlobal('fetch', fetchMock)

        const { MetaProvider } = await import('./meta-provider')
        const provider = new MetaProvider('constructor-token-secret', 'page_secret_id', 'verify-token')

        const result = await provider.sendMessage({
            to: 'psid_secret',
            content: { type: 'text', text: 'hello' },
            metadata: { channel: 'messenger' },
            credentials: {
                accessToken: 'page-token-secret',
                pageId: 'page_secret_id',
            },
        })

        expect(result).toEqual({
            success: false,
            error: 'Social message could not be sent',
        })
        expect(fetchMock).toHaveBeenCalledWith(
            'https://graph.facebook.com/v21.0/me/messages',
            expect.any(Object)
        )

        const logText = collectConsoleCalls(logSpy, errorSpy)
        expect(logText).not.toContain('psid_secret')
        expect(logText).not.toContain('page-token-secret')
        expect(logText).not.toContain('constructor-token-secret')
        expect(logText).not.toContain('page_secret_id')
    })
})
