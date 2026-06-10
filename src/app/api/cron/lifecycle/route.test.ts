import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    processLifecycleTransitions: vi.fn(),
    getExpiringTrials: vi.fn(),
    cleanupAttendancePhotos: vi.fn(),
}))

vi.mock('@/modules/core/lifecycle/lifecycle-actions', () => ({
    processLifecycleTransitions: mocks.processLifecycleTransitions,
    getExpiringTrials: mocks.getExpiringTrials,
}))

vi.mock('@/modules/features/attendance/actions', () => ({
    cleanupAttendancePhotos: mocks.cleanupAttendancePhotos,
}))

function cronRequest() {
    return new Request('https://pixy.test/api/cron/lifecycle', {
        method: 'GET',
        headers: { authorization: 'Bearer cron-secret' },
    })
}

function setupProductionCron() {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('CRON_SECRET', 'cron-secret')
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

describe('/api/cron/lifecycle', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        mocks.processLifecycleTransitions.mockReset()
        mocks.getExpiringTrials.mockReset()
        mocks.cleanupAttendancePhotos.mockReset()
    })

    it('does not expose lifecycle processing details in production responses or logs', async () => {
        setupProductionCron()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.getExpiringTrials.mockResolvedValue([])
        mocks.processLifecycleTransitions.mockResolvedValue({
            success: false,
            results: [],
            error: 'database password secret-value failed during lifecycle transition',
        })

        const { GET } = await import('./route')
        const response = await GET(cronRequest())
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Lifecycle processing failed')
        expect(responseText).not.toContain('details')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('database password')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('database password')
    })

    it('does not log expiring trial owner emails in production', async () => {
        setupProductionCron()
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.getExpiringTrials.mockResolvedValue([
            {
                ownerEmail: 'owner-secret@example.com',
                notificationType: 'trial_expiring',
            },
        ])
        mocks.processLifecycleTransitions.mockResolvedValue({
            success: true,
            results: [],
            error: null,
        })
        mocks.cleanupAttendancePhotos.mockResolvedValue({ count: 0 })

        const { GET } = await import('./route')
        const response = await GET(cronRequest())
        const body = await response.json()
        const responseText = JSON.stringify(body)

        expect(response.status).toBe(200)
        expect(body.success).toBe(true)
        expect(body.notificationsQueued).toBe(1)
        expect(responseText).not.toContain('owner-secret@example.com')

        const logText = collectConsoleCalls(logSpy)
        expect(logText).toContain('Trial notification pending: trial_expiring')
        expect(logText).not.toContain('owner-secret@example.com')
    })
})
