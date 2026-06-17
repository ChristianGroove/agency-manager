import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

function callbackUrl(params: Record<string, string>) {
    const url = new URL('https://pixy.test/auth/callback')
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
    return url.toString()
}

function collectConsoleCalls(spy: ReturnType<typeof vi.spyOn>) {
    return (spy.mock.calls as unknown[][])
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

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
})

describe('/auth/callback', () => {
    it('redirects successful code exchanges to the requested local next path', async () => {
        mocks.createClient.mockResolvedValue({
            auth: {
                exchangeCodeForSession: vi.fn(async () => ({ error: null })),
            },
        })

        const { GET } = await import('./route')
        const response = await GET(new Request(callbackUrl({
            code: 'auth-code',
            next: '/dashboard',
        })))

        expect(response.status).toBe(307)
        expect(response.headers.get('location')).toBe('https://pixy.test/dashboard')
    })

    it('does not expose code exchange failure details in production redirects or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue({
            auth: {
                exchangeCodeForSession: vi.fn(async () => ({
                    error: {
                        name: 'AuthApiError',
                        code: 'otp_expired',
                        message: 'auth provider secret-value failed for customer@example.com',
                    },
                })),
            },
        })

        const { GET } = await import('./route')
        const response = await GET(new Request(callbackUrl({ code: 'auth-code' })))
        const location = response.headers.get('location') || ''

        expect(response.status).toBe(307)
        expect(location).toContain('/auth/auth-code-error')
        expect(location).toContain('error=AuthApiError')
        expect(location).toContain('error_code=otp_expired')
        expect(location).toContain('error_description=Authentication+could+not+be+completed')
        expect(location).not.toContain('secret-value')
        expect(location).not.toContain('customer%40example.com')
        expect(location).not.toContain('auth+provider')

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('customer@example.com')
        expect(logText).not.toContain('auth provider')
        expect(logText).toContain('otp_expired')
    })

    it('does not echo provider error descriptions in production redirects or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

        const { GET } = await import('./route')
        const response = await GET(new Request(callbackUrl({
            error: 'access_denied',
            error_code: 'provider_denied',
            error_description: 'OAuth client secret-value rejected for customer@example.com',
        })))
        const location = response.headers.get('location') || ''

        expect(response.status).toBe(307)
        expect(location).toContain('/auth/auth-code-error')
        expect(location).toContain('error=access_denied')
        expect(location).toContain('error_code=provider_denied')
        expect(location).toContain('error_description=Authentication+provider+rejected+the+request')
        expect(location).not.toContain('secret-value')
        expect(location).not.toContain('customer%40example.com')
        expect(location).not.toContain('OAuth+client')

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('customer@example.com')
        expect(logText).not.toContain('OAuth client')
    })
})
