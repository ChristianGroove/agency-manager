import { afterEach, describe, expect, it, vi } from 'vitest'

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

describe('CallPermissionManager', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        vi.doUnmock('@/modules/core/database/supabase-admin')
    })

    it('does not expose conversation IDs derived from phone numbers in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        vi.doMock('@/modules/core/database/supabase-admin', () => ({
            supabaseAdmin: {
                from: vi.fn(() => ({
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(async () => ({ data: { metadata: {} }, error: null })),
                        })),
                    })),
                    update: vi.fn(() => ({
                        eq: vi.fn(async () => ({ error: null })),
                    })),
                })),
            },
        }))

        const { CallPermissionManager } = await import('./call-permission-manager')
        await new CallPermissionManager().resetLimitsAfterCall('user_15551234567')
        const logText = collectConsoleCalls(logSpy)

        expect(logText).not.toContain('user_15551234567')
        expect(logText).not.toContain('15551234567')
        expect(logText).toContain('conversationIdPresent')
    })

    it('does not expose Supabase failure details in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.doMock('@/modules/core/database/supabase-admin', () => ({
            supabaseAdmin: {
                from: vi.fn(() => ({
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(async () => {
                                throw new Error('db password secret-value for user_15551234567')
                            }),
                        })),
                    })),
                })),
            },
        }))

        const { CallPermissionManager } = await import('./call-permission-manager')
        const result = await new CallPermissionManager().canRequestPermission('user_15551234567')
        const errorText = collectConsoleCalls(errorSpy)

        expect(result.allowed).toBe(true)
        expect(errorText).not.toContain('secret-value')
        expect(errorText).not.toContain('15551234567')
    })
})
