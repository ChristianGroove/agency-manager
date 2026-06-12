import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.from,
    },
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
    const promise = Promise.resolve(result)
    const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        not: vi.fn(async () => result),
        lt: vi.fn(async () => result),
        in: vi.fn(async () => result),
        or: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        maybeSingle: vi.fn(async () => result),
        then: promise.then.bind(promise),
        catch: promise.catch.bind(promise),
        finally: promise.finally.bind(promise),
    }

    return builder
}

function createUpdateBuilder(result: QueryResult = { data: null, error: null }) {
    const promise = Promise.resolve(result)
    const query: any = {
        eq: vi.fn(() => query),
        then: promise.then.bind(promise),
        catch: promise.catch.bind(promise),
        finally: promise.finally.bind(promise),
    }

    return {
        update: vi.fn(() => query),
        query,
    }
}

function createInsertSelectSingleBuilder(result: QueryResult) {
    const singleQuery = {
        single: vi.fn(async () => result),
    }
    const selectQuery = {
        select: vi.fn(() => singleQuery),
    }

    return {
        insert: vi.fn(() => selectQuery),
        selectQuery,
        singleQuery,
    }
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
            'Sub sub-1: Billing cron failed',
        ])
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('service role')
        expect(responseText).not.toContain('Client Secret')
        expect(responseText).not.toContain('Sensitive Subscription')
        expect(body.results.logs).toBeUndefined()

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('service role')
        expect(errorLogText).not.toContain('Client Secret')
    })

    it('scopes overdue notification dedupe to the invoice organization', async () => {
        setupProductionCron()
        vi.spyOn(console, 'log').mockImplementation(() => undefined)

        const notificationLookup = createSelectBuilder({ data: null, error: null })
        const notificationInsert = vi.fn(async () => ({ data: null, error: null }))
        const notificationTable = {
            ...notificationLookup,
            insert: notificationInsert,
        }

        mocks.from.mockImplementation((table: string) => {
            if (table === 'subscriptions') {
                return createSelectBuilder({ data: [], error: null })
            }

            if (table === 'invoices') {
                return createSelectBuilder({
                    data: [{
                        id: 'invoice-1',
                        number: 'INV-1',
                        organization_id: 'org-current',
                        client_id: 'client-1',
                        client: { id: 'client-1', name: 'Client One' },
                    }],
                    error: null,
                })
            }

            if (table === 'notifications') {
                return notificationTable
            }

            if (table === 'organization_members') {
                return createSelectBuilder({
                    data: [{ user_id: 'admin-1' }],
                    error: null,
                })
            }

            throw new Error(`Unexpected table ${table}`)
        })

        const { GET } = await import('./route')
        const response = await GET(cronRequest())
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.results.overdueAlerts).toBe(1)
        expect(notificationLookup.eq).toHaveBeenCalledWith('type', 'payment_due')
        expect(notificationLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(notificationLookup.eq).toHaveBeenCalledWith('action_url', '/invoices/invoice-1')
        expect(notificationInsert).toHaveBeenCalledWith([expect.objectContaining({
            organization_id: 'org-current',
            user_id: 'admin-1',
            type: 'payment_due',
        })])
    })

    it('scopes generated invoice follow-up writes to the subscription organization', async () => {
        setupProductionCron()
        vi.spyOn(console, 'log').mockImplementation(() => undefined)

        const subscription = {
            id: 'sub-1',
            name: 'Hosting',
            organization_id: 'org-current',
            client_id: 'client-1',
            next_billing_date: dateInDays(0),
            amount: 1000,
            frequency: 'monthly',
            clients: { id: 'client-1', name: 'Client One' },
            organizations: { id: 'org-current', name: 'Org One' },
        }
        const subscriptionRead = createSelectBuilder({ data: [subscription], error: null })
        const subscriptionUpdate = createUpdateBuilder()
        const emittersRead = createSelectBuilder({ data: [], error: null })
        const invoiceInsert = createInsertSelectSingleBuilder({
            data: { id: 'invoice-1' },
            error: null,
        })
        const invoiceCycleUpdate = createUpdateBuilder()
        const overdueInvoicesRead = createSelectBuilder({ data: [], error: null })
        const serviceRead = createSelectBuilder({
            data: { id: 'service-1', deleted_at: null },
            error: null,
        })
        const serviceUpdate = createUpdateBuilder()
        const cycleInsert = createInsertSelectSingleBuilder({
            data: { id: 'cycle-1' },
            error: null,
        })
        const membersRead = createSelectBuilder({
            data: [{ user_id: 'admin-1' }],
            error: null,
        })
        const notificationInsert = vi.fn(async () => ({ data: null, error: null }))
        let subscriptionCalls = 0
        let invoiceCalls = 0
        let serviceCalls = 0

        mocks.from.mockImplementation((table: string) => {
            if (table === 'subscriptions') {
                subscriptionCalls += 1
                return subscriptionCalls === 1 ? subscriptionRead : subscriptionUpdate
            }

            if (table === 'emitters') return emittersRead

            if (table === 'invoices') {
                invoiceCalls += 1
                if (invoiceCalls === 1) return invoiceInsert
                if (invoiceCalls === 2) return invoiceCycleUpdate
                return overdueInvoicesRead
            }

            if (table === 'services') {
                serviceCalls += 1
                return serviceCalls === 1 ? serviceRead : serviceUpdate
            }

            if (table === 'billing_cycles') return cycleInsert
            if (table === 'organization_members') return membersRead
            if (table === 'notifications') {
                return { insert: notificationInsert }
            }

            throw new Error(`Unexpected table ${table}`)
        })

        const { GET } = await import('./route')
        const response = await GET(cronRequest())
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.results.invoicesGenerated).toBe(1)
        expect(subscriptionUpdate.query.eq).toHaveBeenCalledWith('id', 'sub-1')
        expect(subscriptionUpdate.query.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(serviceRead.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(serviceRead.eq).toHaveBeenCalledWith('client_id', 'client-1')
        expect(serviceUpdate.query.eq).toHaveBeenCalledWith('id', 'service-1')
        expect(serviceUpdate.query.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(invoiceCycleUpdate.query.eq).toHaveBeenCalledWith('id', 'invoice-1')
        expect(invoiceCycleUpdate.query.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(notificationInsert).toHaveBeenCalledWith([expect.objectContaining({
            organization_id: 'org-current',
            user_id: 'admin-1',
            type: 'invoice_generated',
        })])
    })
})
