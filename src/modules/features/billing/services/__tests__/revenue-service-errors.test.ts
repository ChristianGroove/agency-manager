import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    supabaseAdmin: {
        from: vi.fn(),
    },
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: mocks.supabaseAdmin,
}))

function selectSingleQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function upsertSingleQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        upsert: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function insertSingleQuery(result: { data?: unknown; error?: unknown }, selectColumns?: string) {
    const query: any = {
        insert: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    if (selectColumns) {
        query.select = vi.fn((columns?: string) => {
            expect(columns).toBe(selectColumns)
            return query
        })
    }

    return query
}

function settlementEventsQuery(result: { data?: unknown[] | null; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        gte: vi.fn(() => query),
        lte: vi.fn(() => query),
        contains: vi.fn(async () => result),
    }

    return query
}

function updateFilterQuery(error: unknown = null) {
    const query: any = {
        error,
        update: vi.fn(() => query),
        eq: vi.fn(() => query),
    }

    return query
}

function createQueuedClient(queues: Record<string, any[]>, extra: Record<string, any> = {}) {
    return {
        ...extra,
        from: vi.fn((table: string) => {
            const queue = queues[table]
            if (!queue?.length) throw new Error(`Unexpected table ${table}`)
            return queue.shift()
        }),
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.supabaseAdmin.from.mockReset()
})

describe('RevenueService sanitized errors', () => {
    it('upserts revenue share rules without changing the success contract', async () => {
        const upsertRule = upsertSingleQuery({
            data: { id: 'rule-1', phase_name: 'activation' },
            error: null,
        })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            revenue_share_rules: [upsertRule],
        }))

        const { upsertRevenueShareRule } = await import('../revenue-service')
        const result = await upsertRevenueShareRule({ phase_name: 'activation' })

        expect(result).toEqual({
            success: true,
            data: { id: 'rule-1', phase_name: 'activation' },
        })
        expect(upsertRule.upsert).toHaveBeenCalledWith(expect.objectContaining({
            phase_name: 'activation',
            updated_at: expect.any(String),
        }))
    })

    it('does not expose revenue share rule persistence failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const upsertRule = upsertSingleQuery({
            data: null,
            error: {
                message: 'revenue secret-value failed',
                code: '42501',
            },
        })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            revenue_share_rules: [upsertRule],
        }))

        const { upsertRevenueShareRule } = await import('../revenue-service')
        const result = await upsertRevenueShareRule({ phase_name: 'activation' })

        expect(result).toEqual({
            success: false,
            error: 'No se pudo guardar la regla de revenue share',
        })
    })

    it('does not expose billable event insert failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const organization = selectSingleQuery({
            data: {
                id: 'org-secret-id',
                acquired_by_reseller_id: 'reseller-1',
                acquisition_date: '2026-01-01',
            },
            error: null,
        })
        const billableInsert = insertSingleQuery({
            data: null,
            error: {
                message: 'billable secret-value failed for org-secret-id',
                code: '42501',
            },
        }, 'id')
        mocks.supabaseAdmin.from.mockImplementation((table: string) => {
            if (table === 'organizations') return organization
            if (table === 'billable_events') return billableInsert
            throw new Error(`Unexpected table ${table}`)
        })

        const { registerBillableEvent } = await import('../revenue-service')
        const result = await registerBillableEvent({
            organization_id: 'org-secret-id',
            event_type: 'subscription_base',
            amount: 100,
        })

        expect(result).toEqual({
            success: false,
            error: 'No se pudo registrar el evento facturable',
        })
    })

    it('does not expose settlement event fetch failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const events = settlementEventsQuery({
            data: null,
            error: {
                message: 'settlement secret-value event fetch failed',
                code: '42501',
            },
        })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            billable_events: [events],
        }))

        const { calculateSettlement } = await import('../revenue-service')
        const result = await calculateSettlement({
            reseller_org_id: 'reseller-secret-id',
            period_start: '2026-01-01',
            period_end: '2026-01-31',
        })

        expect(result).toEqual({
            success: false,
            error: 'No se pudo calcular la liquidacion',
        })
    })

    it('does not expose settlement insert failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const events = settlementEventsQuery({
            data: [{ id: 'event-1', amount: 100 }],
            error: null,
        })
        const settlement = insertSingleQuery({
            data: null,
            error: {
                message: 'settlement secret-value insert failed',
                code: '42501',
            },
        }, 'id')
        const rpc = vi.fn(async () => ({
            data: [{ commission_amount: 25, phase_name: 'activation', rule_id: 'rule-1' }],
            error: null,
        }))
        mocks.createClient.mockResolvedValue(createQueuedClient({
            billable_events: [events],
            settlements: [settlement],
        }, { rpc }))

        const { calculateSettlement } = await import('../revenue-service')
        const result = await calculateSettlement({
            reseller_org_id: 'reseller-secret-id',
            period_start: '2026-01-01',
            period_end: '2026-01-31',
        })

        expect(result).toEqual({
            success: false,
            error: 'No se pudo calcular la liquidacion',
        })
    })

    it('does not expose settlement approval failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const update = updateFilterQuery({
            message: 'approval secret-value failed',
            code: '42501',
        })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            settlements: [update],
        }))

        const { approveSettlement } = await import('../revenue-service')
        const result = await approveSettlement('settlement-secret-id', 'user-secret-id')

        expect(result).toEqual({
            success: false,
            error: 'No se pudo aprobar la liquidacion',
        })
        expect(update.update).toHaveBeenCalledWith(expect.objectContaining({
            status: 'approved',
            approved_by: 'user-secret-id',
            approved_at: expect.any(String),
        }))
        expect(update.eq).toHaveBeenCalledWith('id', 'settlement-secret-id')
        expect(update.eq).toHaveBeenCalledWith('status', 'pending')
    })
})
