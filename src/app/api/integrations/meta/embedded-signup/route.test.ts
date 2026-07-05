import { afterEach, describe, expect, it, vi } from 'vitest'

function onboardingRequest() {
    return new Request('https://pixy.test/api/integrations/meta/embedded-signup', {
        method: 'POST',
        body: JSON.stringify({ orgId: 'org_123', code: 'code_123' }),
    }) as any
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

function mockAuthorizedUser() {
    vi.doMock('@/modules/core/database/supabase-server', () => ({
        createClient: vi.fn(async () => ({
            auth: {
                getUser: vi.fn(async () => ({ data: { user: { id: 'user_123' } }, error: null })),
            },
        })),
    }))
    vi.doMock('@/modules/core/iam/services/org-roles', () => ({
        getCurrentOrgRole: vi.fn(async () => 'admin'),
    }))
}

describe('/api/integrations/meta/embedded-signup', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        vi.doUnmock('@/modules/core/database/supabase-server')
        vi.doUnmock('@/modules/core/iam/services/org-roles')
        vi.doUnmock('@/modules/infrastructure/meta/services/onboarding/embedded-signup-handler')
    })

    it('does not expose failed onboarding details to callers', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        mockAuthorizedUser()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        vi.doMock('@/modules/infrastructure/meta/services/onboarding/embedded-signup-handler', () => ({
            embeddedSignupHandler: {
                completeOnboarding: vi.fn(async () => ({
                    success: false,
                    error: 'oauth code secret-value failed during token exchange',
                })),
            },
        }))

        const { POST } = await import('./route')
        const response = await POST(onboardingRequest())
        const responseText = await response.text()

        expect(response.status).toBe(422)
        expect(responseText).toContain('Embedded signup failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('oauth code')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('oauth code')

        const infoLogText = collectConsoleCalls(logSpy)
        expect(infoLogText).not.toContain('org_123')
        expect(infoLogText).toContain('orgIdPresent')
    })

    it('does not expose unexpected onboarding exceptions to callers', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        mockAuthorizedUser()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        vi.doMock('@/modules/infrastructure/meta/services/onboarding/embedded-signup-handler', () => ({
            embeddedSignupHandler: {
                completeOnboarding: vi.fn(async () => {
                    throw new Error('meta app secret secret-value crashed onboarding')
                }),
            },
        }))

        const { POST } = await import('./route')
        const response = await POST(onboardingRequest())
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Internal server error')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('meta app secret')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('meta app secret')

        const infoLogText = collectConsoleCalls(logSpy)
        expect(infoLogText).not.toContain('org_123')
        expect(infoLogText).toContain('orgIdPresent')
    })

    it('keeps completing valid onboarding requests', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        mockAuthorizedUser()
        const completeOnboarding = vi.fn(async () => ({
            success: true,
            connectionId: 'connection_123',
            wabaId: 'waba_123',
        }))
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        vi.doMock('@/modules/infrastructure/meta/services/onboarding/embedded-signup-handler', () => ({
            embeddedSignupHandler: { completeOnboarding },
        }))

        const { POST } = await import('./route')
        const response = await POST(onboardingRequest())
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body).toEqual({
            success: true,
            connectionId: 'connection_123',
            wabaId: 'waba_123',
        })
        expect(completeOnboarding).toHaveBeenCalledWith('org_123', 'code_123', undefined)

        const infoLogText = collectConsoleCalls(logSpy)
        expect(infoLogText).not.toContain('org_123')
        expect(infoLogText).not.toContain('connection_123')
        expect(infoLogText).not.toContain('waba_123')
        expect(infoLogText).toContain('orgIdPresent')
        expect(infoLogText).toContain('connectionIdPresent')
        expect(infoLogText).toContain('wabaIdPresent')
    })
})
