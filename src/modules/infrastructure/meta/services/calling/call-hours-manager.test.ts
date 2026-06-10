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

describe('CallHoursManager', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        vi.resetModules()
    })

    it('does not expose caller phone numbers in production out-of-hours logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

        const { CallHoursManager } = await import('./call-hours-manager')
        const result = await new CallHoursManager().handleOutOfHours({
            callId: 'call_secret_id',
            fromPhoneNumber: '+15551234567',
        })
        const logText = collectConsoleCalls(logSpy)

        expect(result.action).toBe('message')
        expect(logText).not.toContain('call_secret_id')
        expect(logText).not.toContain('+15551234567')
        expect(logText).toContain('fromPhoneNumberPresent')
    })

    it('does not expose Meta sync failure details in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('PHONE_NUMBER_ID', 'phone_secret_id')
        vi.stubEnv('META_ACCESS_TOKEN', 'meta-token-secret')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new Error('meta-token-secret failed for phone_secret_id')
        }))

        const { CallHoursManager } = await import('./call-hours-manager')
        await new CallHoursManager().updateConfig({ timezone: 'America/Bogota' })
        const errorText = collectConsoleCalls(errorSpy)

        expect(errorText).not.toContain('meta-token-secret')
        expect(errorText).not.toContain('phone_secret_id')
    })
})
