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
        vi.restoreAllMocks()
    })

    it('does not expose onboarding exception details in production', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('NEXT_PUBLIC_META_APP_ID', 'app_123')
        vi.stubEnv('META_APP_SECRET', 'app-secret')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
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
    })
})
