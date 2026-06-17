import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    supabaseFrom: vi.fn(),
    revalidatePath: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))



vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
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

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.supabaseFrom.mockReset()
    mocks.revalidatePath.mockReset()
})


beforeEach(() => {
    mocks.createClient.mockResolvedValue({ from: mocks.supabaseFrom });
})

describe('SaaS billing actions', () => {
    it('does not expose subscription fetch failures in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const maybeSingle = vi.fn(async () => ({
            data: null,
            error: {
                message: 'service role secret-value failed for org-secret-id',
                code: '42501',
            },
        }))
        const eq = vi.fn(() => ({ maybeSingle }))
        const select = vi.fn(() => ({ eq }))
        const from = vi.fn(() => ({ select }))
        mocks.createClient.mockResolvedValue({ from })

        const { getSaasSubscription } = await import('./actions')
        const result = await getSaasSubscription('org-secret-id')

        expect(result).toBeNull()
        expect(from).toHaveBeenCalledWith('saas_subscriptions')

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('service role')
        expect(logText).toContain('hasMessage')
    })

    it('initializes manual subscriptions and revalidates the admin organization path', async () => {
        const subscription = { id: 'sub-1', organization_id: 'org-current' }
        const single = vi.fn(async () => ({ data: subscription, error: null }))
        const select = vi.fn(() => ({ single }))
        const upsert = vi.fn(() => ({ select }))
        mocks.supabaseFrom.mockReturnValue({ upsert })

        const { initializeManualSubscription } = await import('./actions')
        const result = await initializeManualSubscription('org-current', 'plan-basic')

        expect(result).toEqual({ success: true, data: subscription })
        expect(mocks.supabaseFrom).toHaveBeenCalledWith('saas_subscriptions')
        expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
            organization_id: 'org-current',
            plan_id: 'plan-basic',
            status: 'legacy_manual',
            payment_gateway: 'manual',
        }))
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/platform/admin/organizations/org-current')
    })

    it('does not expose manual subscription failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const single = vi.fn(async () => ({
            data: null,
            error: {
                message: 'database password secret-value failed for org-secret-id',
                code: '23505',
            },
        }))
        const select = vi.fn(() => ({ single }))
        const upsert = vi.fn(() => ({ select }))
        mocks.supabaseFrom.mockReturnValue({ upsert })

        const { initializeManualSubscription } = await import('./actions')
        const result = await initializeManualSubscription('org-secret-id', 'plan-secret-id')

        expect(result).toEqual({
            success: false,
            error: 'Manual subscription could not be initialized',
        })
        expect(mocks.revalidatePath).not.toHaveBeenCalled()

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('plan-secret-id')
        expect(logText).not.toContain('database password')
        expect(logText).toContain('hasMessage')
    })

    it('does not expose payment method update failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const eq = vi.fn(async () => ({
            error: {
                message: 'wompi token secret-value failed for payment-secret-id',
                code: '42501',
            },
        }))
        const update = vi.fn(() => ({ eq }))
        mocks.supabaseFrom.mockReturnValue({ update })

        const { updateSubscriptionPaymentMethod } = await import('./actions')
        const result = await updateSubscriptionPaymentMethod('org-secret-id', 'payment-secret-id')

        expect(result).toEqual({
            success: false,
            error: 'Payment method could not be updated',
        })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('payment-secret-id')
        expect(logText).not.toContain('wompi token')
        expect(logText).toContain('hasMessage')
    })
})
