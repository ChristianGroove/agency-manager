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

        const errorText = collectConsoleCalls(errorSpy)
        expect(errorText).not.toContain('secret-value')
        expect(errorText).not.toContain('page access token')
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
