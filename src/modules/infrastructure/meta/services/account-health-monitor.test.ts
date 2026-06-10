import { afterEach, describe, expect, it, vi } from 'vitest'

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

describe('AccountHealthMonitor', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
    })

    it('does not expose Meta phone number IDs in production account health logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

        const { AccountHealthMonitor } = await import('./account-health-monitor')
        await new AccountHealthMonitor().processAccountAlert({
            alert_type: 'quality_update',
            phone_number_id: 'phone_secret_id',
            data: {
                previous_quality: 'HIGH',
                current_quality: 'LOW',
            },
        })

        const logText = collectConsoleCalls(logSpy)
        expect(logText).not.toContain('phone_secret_id')
        expect(logText).toContain('phoneNumberIdPresent')
    })
})
