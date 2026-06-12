import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    execute: vi.fn(async (_key: string, callback: () => Promise<unknown>) => callback()),
}))

vi.mock('@/modules/infrastructure/resilience/circuit-breaker', () => ({
    globalCircuitBreaker: {
        execute: mocks.execute,
    },
}))

afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.execute.mockReset()
    mocks.execute.mockImplementation(async (_key: string, callback: () => Promise<unknown>) => callback())
})

describe('EvolutionAdapter', () => {
    it('verifies valid credentials without changing the success contract', async () => {
        const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({
            instance: {
                state: 'open',
                ownerJid: '573001112233@s.whatsapp.net',
            },
        }), { status: 200 }))
        vi.stubGlobal('fetch', fetchMock)

        const { EvolutionAdapter } = await import('./evolution-adapter')
        const result = await new EvolutionAdapter().verifyCredentials({
            baseUrl: 'https://evolution.test/',
            apiKey: 'evolution-api-secret',
            instanceName: 'agency-main',
        })

        expect(result).toEqual({
            isValid: true,
            metadata: {
                status: 'open',
                phone: '573001112233@s.whatsapp.net',
            },
        })
        expect(fetchMock).toHaveBeenCalledWith(
            'https://evolution.test/instance/connectionState/agency-main',
            {
                headers: { apikey: 'evolution-api-secret' },
            }
        )
    })

    it('does not expose verification failures in deployed results', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const fetchMock = vi.fn(async () => new Response('{}', {
            status: 401,
            statusText: 'Unauthorized evolution-api-secret agency-main',
        }))
        vi.stubGlobal('fetch', fetchMock)

        const { EvolutionAdapter } = await import('./evolution-adapter')
        const result = await new EvolutionAdapter().verifyCredentials({
            baseUrl: 'https://evolution.test',
            apiKey: 'evolution-api-secret',
            instanceName: 'agency-main',
        })

        expect(result).toEqual({
            isValid: false,
            error: 'Evolution credentials could not be verified',
        })
        expect(result.error).not.toContain('evolution-api-secret')
        expect(result.error).not.toContain('agency-main')
        expect(result.error).not.toContain('Unauthorized')
    })

    it('checks connection status through the circuit breaker', async () => {
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            instance: { state: 'open' },
        }), { status: 200 }))
        vi.stubGlobal('fetch', fetchMock)

        const { EvolutionAdapter } = await import('./evolution-adapter')
        const result = await new EvolutionAdapter().checkConnectionStatus({
            baseUrl: 'https://evolution.test',
            apiKey: 'evolution-api-secret',
            instanceName: 'agency-main',
        })

        expect(result).toEqual({ status: 'active' })
        expect(mocks.execute).toHaveBeenCalledWith('evolution_status', expect.any(Function))
    })

    it('does not expose status circuit breaker failures in deployed results', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        mocks.execute.mockRejectedValueOnce(new Error('circuit failed for evolution-api-secret agency-main'))

        const { EvolutionAdapter } = await import('./evolution-adapter')
        const result = await new EvolutionAdapter().checkConnectionStatus({
            baseUrl: 'https://evolution.test',
            apiKey: 'evolution-api-secret',
            instanceName: 'agency-main',
        })

        expect(result).toEqual({
            status: 'error',
            message: 'Evolution status check failed',
        })
        expect(result.message).not.toContain('evolution-api-secret')
        expect(result.message).not.toContain('agency-main')
        expect(result.message).not.toContain('circuit failed')
    })
})
