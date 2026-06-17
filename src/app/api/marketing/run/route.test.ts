import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    runMarketingCycle: vi.fn(),
}))

vi.mock('@/modules/features/broadcasts/marketing-runner', () => ({
    runMarketingCycle: mocks.runMarketingCycle,
}))

function cronRequest() {
    return new Request('https://pixy.test/api/marketing/run', {
        method: 'GET',
        headers: { authorization: 'Bearer cron-secret' },
    }) as any
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

describe('/api/marketing/run', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        mocks.runMarketingCycle.mockReset()
    })

    it('does not expose failed marketing runner results in production', async () => {
        setupProductionCron()
        mocks.runMarketingCycle.mockResolvedValue({
            success: false,
            error: 'database password secret-value failed while polling marketing enrollments',
            processed: 0,
        })

        const { GET } = await import('./route')
        const response = await GET(cronRequest())
        const body = await response.json()
        const responseText = JSON.stringify(body)

        expect(response.status).toBe(200)
        expect(body).toEqual({
            success: false,
            error: 'Marketing runner failed',
            processed: 0,
        })
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('database password')
    })

    it('does not expose thrown marketing runner errors in production responses or logs', async () => {
        setupProductionCron()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.runMarketingCycle.mockRejectedValue(
            new Error('provider token secret-value failed while sending marketing message')
        )

        const { GET } = await import('./route')
        const response = await GET(cronRequest())
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Marketing runner failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('provider token')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('provider token')
    })
})
