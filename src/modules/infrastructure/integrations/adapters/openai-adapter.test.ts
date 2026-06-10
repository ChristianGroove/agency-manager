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

describe('OpenAIAdapter', () => {
    it('requires an API key before verification', async () => {
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        const { OpenAIAdapter } = await import('./openai-adapter')
        const result = await new OpenAIAdapter().verifyCredentials({})

        expect(result).toEqual({
            isValid: false,
            error: 'API Key is required',
        })
        expect(fetchMock).not.toHaveBeenCalled()
        expect(mocks.execute).not.toHaveBeenCalled()
    })

    it('verifies valid credentials through the circuit breaker', async () => {
        const fetchMock = vi.fn(async () => ({
            ok: true,
        }))
        vi.stubGlobal('fetch', fetchMock)

        const { OpenAIAdapter } = await import('./openai-adapter')
        const result = await new OpenAIAdapter().verifyCredentials({ api_key: 'sk-secret-value' })

        expect(result).toEqual({ isValid: true })
        expect(mocks.execute).toHaveBeenCalledWith('openai_api', expect.any(Function))
        expect(fetchMock).toHaveBeenCalledWith('https://api.openai.com/v1/models', {
            headers: {
                Authorization: 'Bearer sk-secret-value',
            },
        })
    })

    it('does not expose provider verification errors in deployed results', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const fetchMock = vi.fn(async () => ({
            ok: false,
            statusText: 'Unauthorized',
            json: async () => ({
                error: {
                    message: 'invalid api_key sk-secret-value for org-secret-id',
                },
            }),
        }))
        vi.stubGlobal('fetch', fetchMock)

        const { OpenAIAdapter } = await import('./openai-adapter')
        const result = await new OpenAIAdapter().verifyCredentials({ api_key: 'sk-secret-value' })

        expect(result).toEqual({
            isValid: false,
            error: 'OpenAI credentials could not be verified',
        })
        expect(result.error).not.toContain('sk-secret-value')
        expect(result.error).not.toContain('org-secret-id')
        expect(result.error).not.toContain('invalid api_key')
    })

    it('does not expose circuit breaker failures in deployed results', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubGlobal('fetch', vi.fn())
        mocks.execute.mockRejectedValueOnce(new Error('circuit failed with sk-secret-value'))

        const { OpenAIAdapter } = await import('./openai-adapter')
        const result = await new OpenAIAdapter().verifyCredentials({ api_key: 'sk-secret-value' })

        expect(result).toEqual({
            isValid: false,
            error: 'OpenAI credentials could not be verified',
        })
        expect(result.error).not.toContain('sk-secret-value')
        expect(result.error).not.toContain('circuit failed')
    })
})
