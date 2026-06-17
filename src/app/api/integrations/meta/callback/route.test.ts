import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMetaOAuthState } from '@/modules/infrastructure/meta/services/oauth-state'

function setupMetaCallbackEnv() {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
    vi.stubEnv('META_OAUTH_STATE_SECRET', 'state-secret')
}

function callbackUrl(params: Record<string, string>) {
    const url = new URL('https://pixy.test/api/integrations/meta/callback')
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
    return url.toString()
}

function collectConsoleCalls(spy: ReturnType<typeof vi.spyOn>) {
    return (spy.mock.calls as unknown[][])
        .map((call: unknown[]) => call.map((value: unknown) => {
            if (typeof value === 'string') return value
            try {
                return JSON.stringify(value)
            } catch {
                return String(value)
            }
        }).join(' '))
        .join('\n')
}

function createOrgState() {
    return createMetaOAuthState(
        { flow: 'org', orgId: 'org_123', now: Date.now(), nonce: 'nonce-value-123456' }
    )
}

describe('/api/integrations/meta/callback', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        vi.doUnmock('@supabase/supabase-js')
        vi.doUnmock('@/modules/infrastructure/meta/services/graph-api')
        vi.doUnmock('@/modules/infrastructure/meta/services/waba-subscription-manager')
    })

    it('does not expose provider OAuth error details in production redirects', async () => {
        setupMetaCallbackEnv()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

        const { GET } = await import('./route')
        const response = await GET(new Request(callbackUrl({
            error: 'access_denied',
            error_description: 'Meta app secret secret-value was rejected',
        })))
        const responseText = await response.text()

        expect(response.status).toBe(200)
        expect(responseText).toContain('meta_oauth_failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('Meta app secret')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('Meta app secret')
    })

    it('does not expose token exchange exception details in production redirects', async () => {
        setupMetaCallbackEnv()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.doMock('@/modules/infrastructure/meta/services/graph-api', () => ({
            MetaGraphAPI: class {
                exchangeCodeForToken = vi.fn(async () => {
                    throw new Error('meta app secret secret-value failed token exchange')
                })
            },
        }))

        const { GET } = await import('./route')
        const response = await GET(new Request(callbackUrl({
            code: 'code_123',
            state: createOrgState(),
        })))
        const responseText = await response.text()

        expect(response.status).toBe(200)
        expect(responseText).toContain('exchange_failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('meta app secret')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('meta app secret')
    })

    it('keeps redirecting successful full Meta connections for asset configuration', async () => {
        setupMetaCallbackEnv()
        const insertedConnections: unknown[] = []

        vi.doMock('@supabase/supabase-js', () => ({
            createClient: vi.fn(() => ({
                from: vi.fn(() => {
                    const builder: any = {
                        select: vi.fn(() => builder),
                        eq: vi.fn(() => builder),
                        order: vi.fn(() => builder),
                        limit: vi.fn(async () => ({ data: [], error: null })),
                        insert: vi.fn(async (payload: unknown) => {
                            insertedConnections.push(payload)
                            return { error: null }
                        }),
                    }
                    return builder
                }),
            })),
        }))
        vi.doMock('@/modules/infrastructure/meta/services/graph-api', () => ({
            MetaGraphAPI: class {
                exchangeCodeForToken = vi.fn(async () => 'long-lived-token')
                getUserProfile = vi.fn(async () => ({ id: 'meta_user_123', name: 'Meta User' }))
                getConnectedAssets = vi.fn(async () => [])
                getWhatsAppAccounts = vi.fn(async () => ({ data: [] }))
            },
        }))
        vi.spyOn(console, 'log').mockImplementation(() => undefined)

        const { GET } = await import('./route')
        const response = await GET(new Request(callbackUrl({
            code: 'code_123',
            state: createOrgState(),
        })))
        const responseText = await response.text()

        expect(response.status).toBe(200)
        expect(responseText).toContain('success=meta_connected')
        expect(responseText).toContain('action=configure_assets')
        expect(insertedConnections).toEqual([
            expect.objectContaining({
                organization_id: 'org_123',
                provider_key: 'meta_business',
                credentials: expect.objectContaining({
                    access_token: 'long-lived-token',
                    user_id: 'meta_user_123',
                    user_name: 'Meta User',
                }),
            }),
        ])
    })

    it('does not store page asset tokens in full connection metadata previews', async () => {
        setupMetaCallbackEnv()
        const insertedConnections: any[] = []

        vi.doMock('@supabase/supabase-js', () => ({
            createClient: vi.fn(() => ({
                from: vi.fn(() => {
                    const builder: any = {
                        select: vi.fn(() => builder),
                        eq: vi.fn(() => builder),
                        order: vi.fn(() => builder),
                        limit: vi.fn(async () => ({ data: [], error: null })),
                        insert: vi.fn(async (payload: unknown) => {
                            insertedConnections.push(payload)
                            return { error: null }
                        }),
                    }
                    return builder
                }),
            })),
        }))
        vi.doMock('@/modules/infrastructure/meta/services/graph-api', () => ({
            MetaGraphAPI: class {
                exchangeCodeForToken = vi.fn(async () => 'long-lived-token')
                getUserProfile = vi.fn(async () => ({ id: 'meta_user_123', name: 'Meta User' }))
                getConnectedAssets = vi.fn(async () => [{
                    id: 'page_123',
                    name: 'Pixy Page',
                    access_token: 'page-token-secret-value',
                    instagram_business_account: { id: 'ig_123' },
                }])
                getInstagramUsername = vi.fn(async () => 'pixygram')
                getWhatsAppAccounts = vi.fn(async () => ({ data: [] }))
            },
        }))
        vi.spyOn(console, 'log').mockImplementation(() => undefined)

        const { GET } = await import('./route')
        const response = await GET(new Request(callbackUrl({
            code: 'code_123',
            state: createOrgState(),
        })))
        const responseText = await response.text()

        expect(response.status).toBe(200)
        expect(responseText).toContain('success=meta_connected')

        expect(insertedConnections).toHaveLength(1)
        const payloadText = JSON.stringify(insertedConnections[0])
        expect(payloadText).not.toContain('page-token-secret-value')
        expect(insertedConnections[0].credentials).toEqual(expect.objectContaining({
            access_token: 'long-lived-token',
        }))
        expect(insertedConnections[0].metadata.assets_preview).toEqual([
            expect.not.objectContaining({ access_token: expect.anything() }),
            expect.not.objectContaining({ access_token: expect.anything() }),
        ])
        expect(insertedConnections[0].metadata.assets_preview).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'ig_123', type: 'instagram', page_id: 'page_123' }),
            expect.objectContaining({ id: 'page_123', type: 'page', has_ig: true }),
        ]))
    })

    it('does not expose Meta profile or WABA identifiers in production logs', async () => {
        setupMetaCallbackEnv()
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

        vi.doMock('@supabase/supabase-js', () => ({
            createClient: vi.fn(() => ({
                from: vi.fn(() => {
                    const builder: any = {
                        select: vi.fn(() => builder),
                        eq: vi.fn(() => builder),
                        order: vi.fn(() => builder),
                        limit: vi.fn(async () => ({ data: [], error: null })),
                        insert: vi.fn(async () => ({ error: null })),
                    }
                    return builder
                }),
            })),
        }))
        vi.doMock('@/modules/infrastructure/meta/services/graph-api', () => ({
            MetaGraphAPI: class {
                exchangeCodeForToken = vi.fn(async () => 'long-lived-token-secret-value')
                getUserProfile = vi.fn(async () => ({ id: 'meta_user_secret', name: 'Meta User Secret' }))
                getConnectedAssets = vi.fn(async () => [])
                getWhatsAppAccounts = vi.fn(async () => ({
                    data: [{
                        id: 'waba_sensitive_123',
                        name: 'Sensitive WABA',
                        phone_numbers: { data: [] },
                    }],
                }))
            },
        }))
        vi.doMock('@/modules/infrastructure/meta/services/waba-subscription-manager', () => ({
            wabaSubscriptionManager: {
                batchSubscribe: vi.fn(async () => [{
                    success: false,
                    wabaId: 'waba_sensitive_123',
                    error: 'batch secret-value',
                }]),
            },
        }))

        const { GET } = await import('./route')
        const response = await GET(new Request(callbackUrl({
            code: 'code_123',
            state: createOrgState(),
        })))
        const responseText = await response.text()

        expect(response.status).toBe(200)
        expect(responseText).toContain('success=meta_connected')

        const logText = [
            collectConsoleCalls(logSpy),
            collectConsoleCalls(errorSpy),
        ].join('\n')

        expect(logText).toContain('userNamePresent')
        expect(logText).toContain('wabaIdPresent')
        expect(logText).not.toContain('Meta User Secret')
        expect(logText).not.toContain('waba_sensitive_123')
        expect(logText).not.toContain('long-lived-token-secret-value')
        expect(logText).not.toContain('batch secret-value')
    })
})
