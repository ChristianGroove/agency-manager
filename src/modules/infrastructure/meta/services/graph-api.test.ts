import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    fetch: vi.fn(),
}))

function collectConsoleCalls(spy: ReturnType<typeof vi.spyOn>) {
    return (spy.mock.calls as unknown[][])
        .map((call: unknown[]) => call.map((value: unknown) => {
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

function setupProductionEnv() {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('META_APP_ID', 'meta-app-id')
    vi.stubEnv('META_APP_SECRET', 'meta-app-secret-value')
    vi.stubGlobal('fetch', mocks.fetch)
}

function metaError(message: string, code = 190) {
    return {
        error: {
            message,
            type: 'OAuthException',
            code,
            error_subcode: 460,
            fbtrace_id: 'trace_123',
        },
    }
}

describe('MetaGraphAPI', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        vi.resetModules()
        mocks.fetch.mockReset()
    })

    it('does not expose token exchange failure details in production', async () => {
        setupProductionEnv()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.fetch.mockResolvedValue(new Response(JSON.stringify(
            metaError('meta app secret secret-value failed token exchange')
        ), { status: 400 }))

        const { MetaGraphAPI } = await import('./graph-api')
        await expect(new MetaGraphAPI('https://pixy.test').exchangeCodeForToken('code_123'))
            .rejects.toThrow('Meta Token Exchange Failed')

        const errorText = collectConsoleCalls(errorSpy)
        expect(errorText).not.toContain('secret-value')
        expect(errorText).not.toContain('meta app secret')
    })

    it('does not expose page webhook subscription details in production', async () => {
        setupProductionEnv()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.fetch.mockResolvedValue(new Response(JSON.stringify(
            metaError('page access token secret-value failed webhook subscription')
        ), { status: 400 }))

        const { MetaGraphAPI } = await import('./graph-api')
        const result = await new MetaGraphAPI('https://pixy.test')
            .subscribePageWebhooks('page_123', 'page-token-secret-value')
        const resultText = JSON.stringify(result)

        expect(result).toEqual({ success: false, error: 'Meta webhook subscription failed' })
        expect(resultText).not.toContain('secret-value')
        expect(resultText).not.toContain('page access token')
        const webhookFetchCall = mocks.fetch.mock.calls[0] as unknown[]
        expect(String(webhookFetchCall[0])).not.toContain('access_token')
        expect(webhookFetchCall[1]).toEqual(expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
                Authorization: 'Bearer page-token-secret-value',
            }),
        }))

        const errorText = collectConsoleCalls(errorSpy)
        expect(errorText).not.toContain('secret-value')
        expect(errorText).not.toContain('page access token')
    })

    it('uses Authorization headers instead of query tokens for connected assets', async () => {
        setupProductionEnv()
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.fetch.mockResolvedValue(new Response(JSON.stringify({
            data: [{
                id: 'page_123',
                name: 'Pixy Page',
                access_token: 'page-token-from-meta',
                tasks: ['MANAGE'],
            }],
        }), { status: 200 }))

        const { MetaGraphAPI } = await import('./graph-api')
        const result = await new MetaGraphAPI('https://pixy.test')
            .getConnectedAssets('user-token-secret-value')

        expect(result).toEqual([expect.objectContaining({
            id: 'page_123',
            access_token: 'page-token-from-meta',
        })])
        const assetsFetchCall = mocks.fetch.mock.calls[0] as unknown[]
        const assetsUrl = new URL(String(assetsFetchCall[0]))
        expect(String(assetsFetchCall[0])).toContain('/me/accounts')
        expect(assetsUrl.searchParams.has('access_token')).toBe(false)
        expect(assetsFetchCall[1]).toEqual(expect.objectContaining({
            headers: expect.objectContaining({
                Authorization: 'Bearer user-token-secret-value',
            }),
        }))
    })

    it('uses Authorization headers instead of query tokens for read-only graph calls', async () => {
        setupProductionEnv()
        mocks.fetch
            .mockResolvedValueOnce(new Response(JSON.stringify({ username: 'pixygram' }), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user_123', name: 'Meta User', email: 'meta@example.com' }), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                data: [{ id: 'act_123', name: 'Pixy Ads', account_id: '123', currency: 'COP' }],
            }), { status: 200 }))

        const { MetaGraphAPI } = await import('./graph-api')
        const api = new MetaGraphAPI('https://pixy.test')

        await expect(api.getInstagramUsername('ig_123', 'instagram-token-secret-value'))
            .resolves.toBe('pixygram')
        await expect(api.getUserProfile('user-token-secret-value'))
            .resolves.toEqual({ id: 'user_123', name: 'Meta User', email: 'meta@example.com' })
        await expect(api.getAdAccounts('ad-token-secret-value'))
            .resolves.toEqual([{ id: 'act_123', name: 'Pixy Ads', account_id: '123', currency: 'COP' }])

        const expectedCalls = [
            ['ig_123', 'instagram-token-secret-value'],
            ['/me', 'user-token-secret-value'],
            ['/me/adaccounts', 'ad-token-secret-value'],
        ] as const

        for (const [index, [pathFragment, token]] of expectedCalls.entries()) {
            const fetchCall = mocks.fetch.mock.calls[index] as unknown[]
            const fetchUrl = new URL(String(fetchCall[0]))
            expect(String(fetchCall[0])).toContain(pathFragment)
            expect(fetchUrl.searchParams.has('access_token')).toBe(false)
            expect(fetchCall[1]).toEqual(expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: `Bearer ${token}`,
                }),
            }))
        }
    })

    it('does not expose WABA discovery errors in production results or logs', async () => {
        setupProductionEnv()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.fetch
            .mockResolvedValueOnce(new Response(JSON.stringify(metaError('direct token secret-value failed')), { status: 400 }))
            .mockResolvedValueOnce(new Response(JSON.stringify(metaError('business token secret-value failed')), { status: 400 }))
            .mockResolvedValueOnce(new Response(JSON.stringify(metaError('pages token secret-value failed')), { status: 400 }))
            .mockResolvedValueOnce(new Response(JSON.stringify(metaError('debug token secret-value failed')), { status: 400 }))

        const { MetaGraphAPI } = await import('./graph-api')
        const result = await new MetaGraphAPI('https://pixy.test')
            .getWhatsAppAccounts('user-token-secret-value')
        const resultText = JSON.stringify(result)

        expect(result.data).toEqual([])
        expect(result.error).toEqual({
            message: 'No WhatsApp accounts found',
            strategies_attempted: [
                { strategy: 'direct', code: 190, subcode: 460, type: 'OAuthException', traceId: 'trace_123' },
                { strategy: 'business', code: 190, subcode: 460, type: 'OAuthException', traceId: 'trace_123' },
                { strategy: 'pages', code: 190, subcode: 460, type: 'OAuthException', traceId: 'trace_123' },
                { strategy: 'granular_token', code: 190, subcode: 460, type: 'OAuthException', traceId: 'trace_123' },
            ],
        })
        expect(resultText).not.toContain('secret-value')
        expect(resultText).not.toContain('token secret')

        const errorText = collectConsoleCalls(errorSpy)
        expect(errorText).not.toContain('secret-value')
        expect(errorText).not.toContain('token secret')
    })
})
