import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    supabaseFrom: vi.fn(),
    revalidatePath: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    },
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

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

function createQuery(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        gte: vi.fn(() => query),
        lte: vi.fn(() => query),
        contains: vi.fn(() => query),
        order: vi.fn(() => query),
        insert: vi.fn(() => query),
        upsert: vi.fn(() => query),
        update: vi.fn(() => query),
        rpc: vi.fn(() => query),
        single: vi.fn(async () => result),
        then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject),
    }

    return query
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.supabaseFrom.mockReset()
    mocks.revalidatePath.mockReset()
})

describe('platform revenue actions', () => {
    it('registers billable events through the admin client', async () => {
        const organizationQuery = createQuery({
            data: {
                id: 'org-current',
                acquired_by_reseller_id: 'reseller-1',
                acquisition_date: '2026-01-01T00:00:00Z',
            },
            error: null,
        })
        const eventQuery = createQuery({
            data: { id: 'event-1' },
            error: null,
        })
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'organizations') return organizationQuery
            if (table === 'billable_events') return eventQuery
            throw new Error(`Unexpected table ${table}`)
        })

        const { registerBillableEvent } = await import('./actions')
        const result = await registerBillableEvent({
            organization_id: 'org-current',
            event_type: 'subscription_base',
            amount: 25000,
            currency: 'USD',
        })

        expect(result).toEqual({ success: true, event_id: 'event-1' })
        expect(mocks.supabaseFrom).toHaveBeenCalledWith('organizations')
        expect(mocks.supabaseFrom).toHaveBeenCalledWith('billable_events')
        expect(eventQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
            organization_id: 'org-current',
            reseller_chain: [{ org_id: 'reseller-1', level: 1 }],
            event_type: 'subscription_base',
            amount: 25000,
            currency: 'USD',
        }))
    })

    it('does not expose billable event insert failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const organizationQuery = createQuery({
            data: {
                id: 'org-secret-id',
                acquired_by_reseller_id: null,
                acquisition_date: null,
            },
            error: null,
        })
        const eventQuery = createQuery({
            data: null,
            error: {
                message: 'revenue secret-value failed for invoice-secret-id',
                code: '42501',
            },
        })
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'organizations') return organizationQuery
            if (table === 'billable_events') return eventQuery
            throw new Error(`Unexpected table ${table}`)
        })

        const { registerBillableEvent } = await import('./actions')
        const result = await registerBillableEvent({
            organization_id: 'org-secret-id',
            event_type: 'subscription_base',
            amount: 25000,
            invoice_id: 'invoice-secret-id',
        })

        expect(result).toEqual({
            success: false,
            error: 'Billable event could not be registered',
        })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('invoice-secret-id')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('revenue secret')
        expect(logText).toContain('hasMessage')
    })

    it('does not expose revenue share rule failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const ruleQuery = createQuery({
            data: null,
            error: {
                message: 'rule secret-value failed for reseller-secret-id',
                code: '23505',
            },
        })
        mocks.createClient.mockResolvedValue({
            from: vi.fn(() => ruleQuery),
        })

        const { upsertRevenueShareRule } = await import('./actions')
        const result = await upsertRevenueShareRule({
            phase_name: 'activation',
            phase_start_month: 0,
            commission_percent: 20,
            eligible_event_types: ['subscription_base'],
        })

        expect(result).toEqual({
            success: false,
            error: 'Revenue share rule could not be saved',
        })
        expect(mocks.revalidatePath).not.toHaveBeenCalled()

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('reseller-secret-id')
        expect(logText).not.toContain('rule secret')
        expect(logText).toContain('hasMessage')
    })

    it('does not expose settlement event fetch failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const eventsQuery = createQuery({
            data: null,
            error: {
                message: 'settlement secret-value failed for reseller-secret-id',
                code: '42501',
            },
        })
        mocks.createClient.mockResolvedValue({
            from: vi.fn(() => eventsQuery),
        })

        const { calculateSettlement } = await import('./actions')
        const result = await calculateSettlement({
            reseller_org_id: 'reseller-secret-id',
            period_start: '2026-01-01',
            period_end: '2026-01-31',
        })

        expect(result).toEqual({
            success: false,
            error: 'Settlement could not be calculated',
        })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('reseller-secret-id')
        expect(logText).not.toContain('settlement secret')
        expect(logText).toContain('hasMessage')
    })
})
