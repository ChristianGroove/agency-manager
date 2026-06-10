import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

function verifyUrl(params: Record<string, string>) {
    const url = new URL('https://pixy.test/auth/verify')
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

describe('/auth/verify', () => {
    it('redirects successful OTP verification to a same-origin next path', async () => {
        mocks.createClient.mockResolvedValue({
            auth: {
                verifyOtp: vi.fn(async () => ({ error: null })),
            },
        })

        const { GET } = await import('./route')
        const response = await GET(new Request(verifyUrl({
            token_hash: 'token-hash',
            type: 'email',
            next: '/platform',
        })) as any)

        expect(response.status).toBe(307)
        expect(response.headers.get('location')).toBe('https://pixy.test/platform')
    })

    it('does not redirect successful OTP verification to an external next URL', async () => {
        mocks.createClient.mockResolvedValue({
            auth: {
                verifyOtp: vi.fn(async () => ({ error: null })),
            },
        })

        const { GET } = await import('./route')
        const response = await GET(new Request(verifyUrl({
            token_hash: 'token-hash',
            type: 'email',
            next: 'https://evil.example/phish',
        })) as any)

        expect(response.status).toBe(307)
        expect(response.headers.get('location')).toBe('https://pixy.test/dashboard')
    })

    it('does not expose OTP verification errors in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue({
            auth: {
                verifyOtp: vi.fn(async () => ({
                    error: {
                        name: 'AuthApiError',
                        code: 'otp_expired',
                        message: 'otp secret-value failed for customer@example.com',
                    },
                })),
            },
        })

        const { GET } = await import('./route')
        const response = await GET(new Request(verifyUrl({
            token_hash: 'token-hash',
            type: 'email',
        })) as any)

        expect(response.status).toBe(307)
        expect(response.headers.get('location')).toBe('https://pixy.test/auth/auth-code-error')

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).toContain('otp_expired')
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('customer@example.com')
        expect(logText).not.toContain('otp secret')
    })
})
