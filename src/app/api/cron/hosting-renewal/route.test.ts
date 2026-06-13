import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mocks.from,
    })),
}))

type QueryResult = { data?: any, error?: any }

function cronRequest() {
    return new Request('https://pixy.test/api/cron/hosting-renewal', {
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

function dueDateInDays(days: number) {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + days)
    return date.toISOString()
}

function createSelectBuilder(result: QueryResult) {
    const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        not: vi.fn(async () => result),
        in: vi.fn(async () => result),
    }

    return builder
}

describe('/api/cron/hosting-renewal', () => {
    beforeEach(() => {
        Object.assign(supabaseAdmin, { from: mocks.from })
    })

    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        mocks.from.mockReset()
    })

    it('does not expose hosting account fetch failures in production responses or logs', async () => {
        setupProductionCron()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.from.mockImplementation((table: string) => {
            if (table === 'hosting_accounts') {
                return createSelectBuilder({
                    data: null,
                    error: { message: 'database password secret-value failed reading hosting accounts' },
                })
            }

            return createSelectBuilder({ data: [], error: null })
        })

        const { GET } = await import('./route')
        const response = await GET(cronRequest())
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Hosting renewal cron failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('database password')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('database password')
    })

    it('does not expose per-account processing failures in production results or logs', async () => {
        setupProductionCron()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.from.mockImplementation((table: string) => {
            if (table === 'hosting_accounts') {
                return createSelectBuilder({
                    data: [{
                        id: 'hosting-1',
                        organization_id: 'org-1',
                        client_id: 'client-1',
                        domain_url: 'example.com',
                        provider_name: 'Provider',
                        renewal_date: dueDateInDays(30),
                        client: { id: 'client-1', name: 'Client One', email: 'client@example.com' },
                    }],
                    error: null,
                })
            }

            if (table === 'organization_members') {
                return createSelectBuilder({
                    data: [{ user_id: 'user-1' }],
                    error: null,
                })
            }

            if (table === 'notifications') {
                return {
                    insert: vi.fn(async () => {
                        throw new Error('notification service role secret-value failed')
                    }),
                }
            }

            return createSelectBuilder({ data: [], error: null })
        })

        const { GET } = await import('./route')
        const response = await GET(cronRequest())
        const body = await response.json()
        const responseText = JSON.stringify(body)

        expect(response.status).toBe(200)
        expect(body.success).toBe(true)
        expect(body.results.errors).toEqual([
            'Hosting renewal cron failed',
        ])
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('service role')
        expect(responseText).not.toContain('hosting-1')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('service role')
        expect(errorLogText).not.toContain('hosting-1')
    })
})
