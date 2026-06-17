import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmbeddedSignupHandler } from './embedded-signup-handler'

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

describe('EmbeddedSignupHandler', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('does not expose onboarding exception details in production', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('NEXT_PUBLIC_META_APP_ID', 'app_123')
        vi.stubEnv('META_APP_SECRET', 'app-secret')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        vi.stubGlobal('fetch', vi.fn(async () => ({
            json: vi.fn(async () => ({
                error: { message: 'oauth code secret-value rejected by Meta' },
            })),
        })))

        const handler = new EmbeddedSignupHandler()
        const result = await handler.completeOnboarding('org_123', 'code_123')

        expect(result).toEqual({
            success: false,
            error: 'Embedded signup failed',
        })

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('oauth code')

        const infoLogText = collectConsoleCalls(logSpy)
        expect(infoLogText).not.toContain('org_123')
        expect(infoLogText).toContain('orgIdPresent')
    })

    it('does not expose WABA warning payloads in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: false,
            json: vi.fn(async () => ({
                error: {
                    message: 'waba-secret-1 access-token-secret subscription failed',
                },
            })),
        })))

        const handler = new EmbeddedSignupHandler() as unknown as {
            subscribeSmbMessageEchoes(wabaId: string, accessToken: string): Promise<void>
        }

        await handler.subscribeSmbMessageEchoes('waba-secret-1', 'access-token-secret')

        const warnLogText = collectConsoleCalls(warnSpy)
        expect(warnLogText).not.toContain('waba-secret-1')
        expect(warnLogText).not.toContain('access-token-secret')
        expect(warnLogText).not.toContain('subscription failed')
        expect(warnLogText).toContain('wabaIdPresent')
    })
})
