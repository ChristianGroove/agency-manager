import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    supabaseFrom: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mocks.supabaseFrom,
    }))
}))

function collectConsoleCalls(...spies: ReturnType<typeof vi.spyOn>[]) {
    return spies
        .flatMap(spy => spy.mock.calls as unknown[][])
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

function querySingle(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function insertQuery(result: unknown = { error: null }) {
    const query: any = {
        insert: vi.fn(async () => result),
    }

    return query
}

function createSubscriptionQuery() {
    return querySingle({
        data: {
            id: 'subscription-secret-id-0000',
            organization_id: 'org-secret-id',
            payment_method_id: 'payment-token-secret',
            custom_price: 10,
            bypass_until: null,
            plan_id: 'plan-secret-id',
            metadata: { acceptance_token: 'acceptance-secret' },
            organizations: { name: 'Org Secret' },
        },
        error: null,
    })
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.supabaseFrom.mockReset()
})

describe('WompiSaasAdapter logging', () => {
    it('does not expose Wompi SaaS subscription or transaction identifiers in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

        const { WompiSaasAdapter } = await import('./wompi')
        const adapter = new WompiSaasAdapter()

        await adapter.createSubscription('org-secret-id', 'plan-secret-id')
        await adapter.handleWebhook({
            data: {
                transaction: {
                    status: 'APPROVED',
                    reference: 'ref-secret-value',
                },
            },
        })

        const logText = collectConsoleCalls(logSpy)
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('plan-secret-id')
        expect(logText).not.toContain('ref-secret-value')
        expect(logText).toContain('orgIdPresent')
        expect(logText).toContain('planIdPresent')
        expect(logText).toContain('referencePresent')
    })

    it('does not expose recurring charge identifiers while preserving the Wompi request payload', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('WOMPI_PRIVATE_KEY', 'wompi-private-secret')
        vi.spyOn(Date, 'now').mockReturnValue(1710000000000)
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({
            data: { id: 'txn-secret-id' },
        }), { status: 200 }))
        vi.stubGlobal('fetch', fetchMock)

        const transactionInsert = insertQuery()
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'saas_subscriptions') return createSubscriptionQuery()
            if (table === 'payment_transactions') return transactionInsert
            throw new Error(`Unexpected table ${table}`)
        })

        const { WompiSaasAdapter } = await import('./wompi')
        const adapter = new WompiSaasAdapter()
        const result = await adapter.chargeRecurring('subscription-secret-id-0000')

        expect(result).toBe(true)
        const fetchOptions = fetchMock.mock.calls[0]?.[1] as RequestInit & { headers: Record<string, string>; body: string }
        const requestBody = JSON.parse(fetchOptions.body)
        expect(fetchOptions.headers.Authorization).toBe('Bearer wompi-private-secret')
        expect(requestBody).toEqual(expect.objectContaining({
            acceptance_token: 'acceptance-secret',
            amount_in_cents: 1000,
            currency: 'COP',
            reference: 'SUB-subscription-1710000000000',
            metadata: expect.objectContaining({
                organization_id: 'org-secret-id',
                subscription_id: 'subscription-secret-id-0000',
            }),
            payment_method: expect.objectContaining({
                token: 'payment-token-secret',
            }),
        }))
        expect(transactionInsert.insert).toHaveBeenCalledWith(expect.objectContaining({
            organization_id: 'org-secret-id',
            reference: 'SUB-subscription-1710000000000',
            metadata: expect.objectContaining({
                subscription_id: 'subscription-secret-id-0000',
                transaction_id: 'txn-secret-id',
            }),
        }))

        const logText = collectConsoleCalls(logSpy)
        expect(logText).not.toContain('subscription-secret-id-0000')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('plan-secret-id')
        expect(logText).not.toContain('payment-token-secret')
        expect(logText).not.toContain('acceptance-secret')
        expect(logText).not.toContain('SUB-subscription-1710000000000')
        expect(logText).toContain('subscriptionIdPresent')
        expect(logText).toContain('referencePresent')
    })

    it('does not expose recurring charge failures in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.spyOn(Date, 'now').mockReturnValue(1710000000000)
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({
            error: { type: 'secret-wompi-error-for-subscription-secret-id' },
        }), { status: 400 }))
        vi.stubGlobal('fetch', fetchMock)

        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'saas_subscriptions') return createSubscriptionQuery()
            throw new Error(`Unexpected table ${table}`)
        })

        const { WompiSaasAdapter } = await import('./wompi')
        const adapter = new WompiSaasAdapter()
        const result = await adapter.chargeRecurring('subscription-secret-id-0000')

        expect(result).toBe(false)
        const logText = collectConsoleCalls(logSpy, errorSpy)
        expect(logText).not.toContain('subscription-secret-id-0000')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('secret-wompi-error-for-subscription-secret-id')
        expect(logText).not.toContain('SUB-subscription-1710000000000')
        expect(logText).toContain('subscriptionIdPresent')
        expect(logText).toContain('referencePresent')
        expect(logText).toContain('detail')
    })
})
