import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    decryptObject: vi.fn((value: unknown) => value),
    execute: vi.fn(async (_key: string, fn: () => Promise<unknown>) => fn()),
}))

vi.mock('@/modules/infrastructure/integrations/encryption', () => ({
    decryptObject: mocks.decryptObject,
}))

vi.mock('@/modules/infrastructure/resilience/circuit-breaker', () => ({
    globalCircuitBreaker: {
        execute: mocks.execute,
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

afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.decryptObject.mockReset()
    mocks.decryptObject.mockImplementation((value: unknown) => value)
    mocks.execute.mockReset()
    mocks.execute.mockImplementation(async (_key: string, fn: () => Promise<unknown>) => fn())
})

describe('MetaAdapter', () => {
    it('does not expose Meta send credentials or payload details in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            error: {
                message: 'meta token secret-value failed for +1555secret',
                type: 'OAuthException',
                code: 190,
            },
        }), { status: 400, statusText: 'Bad Request' }))
        vi.stubGlobal('fetch', fetchMock)

        const { MetaAdapter } = await import('./meta-adapter')
        const adapter = new MetaAdapter()

        await expect(adapter.sendMessage(
            {
                phoneNumberId: 'phone_secret_id',
                accessToken: 'meta-access-secret',
            },
            '+1555secret',
            { type: 'text', text: 'hello' },
            {
                channel: 'whatsapp',
                phoneNumberId: 'phone_secret_id',
                secret: 'metadata-secret',
            }
        )).rejects.toThrow('Meta send failed')

        expect(fetchMock).toHaveBeenCalledWith(
            'https://graph.facebook.com/v21.0/phone_secret_id/messages',
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer meta-access-secret',
                }),
            })
        )

        const logText = collectConsoleCalls(logSpy, warnSpy, errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('meta-access-secret')
        expect(logText).not.toContain('phone_secret_id')
        expect(logText).not.toContain('+1555secret')
        expect(logText).not.toContain('metadata-secret')
    })
})
