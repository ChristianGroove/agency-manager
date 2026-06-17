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
    return new Request('https://pixy.test/api/cron/billing', {
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

function dateInDays(days: number) {
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
        lt: vi.fn(async () => result),
        in: vi.fn(async () => result),
        or: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        maybeSingle: vi.fn(async () => result),
    }

    return builder
}

function mockBillingTables(results: {
    subscriptions?: QueryResult
    overdueInvoices?: QueryResult
    members?: QueryResult
    notificationsInsert?: () => Promise<any>
}) {
    mocks.from.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
            return createSelectBuilder(results.subscriptions ?? { data: [], error: null })
        }

        if (table === 'invoices') {
            return createSelectBuilder(results.overdueInvoices ?? { data: [], error: null })
        }

        if (table === 'organization_members') {
            return createSelectBuilder(results.members ?? { data: [], error: null })
        }

        if (table === 'notifications') {
            return {
                insert: vi.fn(results.notificationsInsert ?? (async () => ({ data: null, error: null }))),
            }
        }

        throw new Error(`Unexpected table ${table}`)
    })
}

describe('/api/cron/billing', () => {
    beforeEach(() => {
        Object.assign(supabaseAdmin, { from: mocks.from })
    })

    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        mocks.from.mockReset()
    })

    it('does not expose subscription fetch failures in production responses or logs', async () => {
        setupProductionCron()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mockBillingTables({
            subscriptions: {
                data: null,
                error: { message: 'database password secret-value failed reading subscriptions' },
            },
        })

        const { GET } = await import('./route')
        const response = await GET(cronRequest())
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Billing cron failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('database password')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('database password')
    })

    it('omits detailed logs from production success responses', async () => {
        setupProductionCron()
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mockBillingTables({
            subscriptions: { data: [], error: null },
            overdueInvoices: { data: [], error: null },
        })

        const { GET } = await import('./route')
        const response = await GET(cronRequest())
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body).toEqual({
            success: true,
            results: {
                remindersSent: 0,
                invoicesGenerated: 0,
                overdueAlerts: 0,
                errors: [],
            },
        })
        expect(body.results.logs).toBeUndefined()
    })

    it('does not expose per-subscription notification failures in production results or logs', async () => {
        setupProductionCron()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mockBillingTables({
            subscriptions: {
                data: [{
                    id: 'sub-1',
                    name: 'Sensitive Subscription',
                    organization_id: 'org-1',
                    client_id: 'client-1',
                    next_billing_date: dateInDays(2),
                    amount: 123456,
                    frequency: 'monthly',
                    clients: { id: 'client-1', name: 'Client Secret' },
                    organizations: { id: 'org-1', name: 'Org Secret' },
                }],
                error: null,
            },
            overdueInvoices: { data: [], error: null },
            members: { data: [{ user_id: 'user-1' }], error: null },
            notificationsInsert: async () => {
                throw new Error('notification service role secret-value failed for Client Secret')
            },
        })

        const { GET } = await import('./route')
        const response = await GET(cronRequest())
        const body = await response.json()
        const responseText = JSON.stringify(body)

        expect(response.status).toBe(200)
        expect(body.success).toBe(true)
        expect(body.results.errors).toEqual([
            'Billing cron failed',
        ])
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('service role')
        expect(responseText).not.toContain('Client Secret')
        expect(responseText).not.toContain('Sensitive Subscription')
        expect(responseText).not.toContain('sub-1')
        expect(body.results.logs).toBeUndefined()

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('service role')
        expect(errorLogText).not.toContain('Client Secret')
        expect(errorLogText).not.toContain('sub-1')
    })
})
