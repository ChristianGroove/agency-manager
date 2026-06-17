import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
    checkConnectionHealth: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mocks.from,
    })),
}))

vi.mock('@/modules/features/channels/connection-health', () => ({
    checkConnectionHealth: mocks.checkConnectionHealth,
}))

type QueryResult = { data?: any, error?: any }

function cronRequest() {
    return new Request('https://pixy.test/api/cron/check-connections', {
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

function mockConnections(result: QueryResult) {
    mocks.from.mockImplementation((table: string) => {
        if (table !== 'integration_connections') {
            throw new Error(`Unexpected table ${table}`)
        }

        const builder: any = {
            select: vi.fn(() => builder),
            neq: vi.fn(() => builder),
            order: vi.fn(async () => result),
        }

        return builder
    })
}

describe('/api/cron/check-connections', () => {
    beforeEach(() => {
        Object.assign(supabaseAdmin, { from: mocks.from })
    })

    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        mocks.from.mockReset()
        mocks.checkConnectionHealth.mockReset()
    })

    it('does not expose connection fetch failures in production responses or logs', async () => {
        setupProductionCron()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mockConnections({
            data: null,
            error: { message: 'database password secret-value failed loading connections' },
        })

        const { GET } = await import('./route')
        const response = await GET(cronRequest())
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Failed to fetch connections')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('database password')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('database password')
    })

    it('does not expose per-connection health exceptions in production logs', async () => {
        setupProductionCron()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mockConnections({
            data: [{
                id: 'connection-secret-id',
                organization_id: 'org-secret-id',
                connection_name: 'Meta WhatsApp Secret',
                provider_key: 'meta_whatsapp',
            }],
            error: null,
        })
        mocks.checkConnectionHealth.mockRejectedValue(
            new Error('meta access token secret-value failed during health check')
        )

        const { GET } = await import('./route')
        const response = await GET(cronRequest())
        const body = await response.json()
        const responseText = JSON.stringify(body)

        expect(response.status).toBe(200)
        expect(body).toMatchObject({
            success: true,
            checked: 1,
            healthy: 0,
            issues: 1,
        })
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('access token')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('connection-secret-id')
        expect(errorLogText).not.toContain('org-secret-id')
        expect(errorLogText).not.toContain('Meta WhatsApp Secret')
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('access token')
        expect(errorLogText).toContain('connectionIdPresent')
        expect(errorLogText).toContain('connectionNamePresent')
        expect(errorLogText).toContain('organizationIdPresent')
    })

    it('does not expose unhealthy connection identifiers in production logs', async () => {
        setupProductionCron()
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mockConnections({
            data: [{
                id: 'connection-secret-id',
                organization_id: 'org-secret-id',
                connection_name: 'Meta WhatsApp Secret',
                provider_key: 'meta_whatsapp',
            }],
            error: null,
        })
        mocks.checkConnectionHealth.mockResolvedValue({
            status: 'error',
            message: 'meta token secret-value failed',
        })

        const { GET } = await import('./route')
        const response = await GET(cronRequest())
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body).toMatchObject({
            success: true,
            checked: 1,
            healthy: 0,
            issues: 1,
        })

        const logText = collectConsoleCalls(logSpy)
        expect(logText).not.toContain('connection-secret-id')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('Meta WhatsApp Secret')
        expect(logText).not.toContain('secret-value')
        expect(logText).toContain('connectionIdPresent')
        expect(logText).toContain('connectionNamePresent')
        expect(logText).toContain('organizationIdPresent')
    })
})
