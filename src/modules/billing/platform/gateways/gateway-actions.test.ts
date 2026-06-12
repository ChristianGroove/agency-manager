import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    supabaseFrom: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    },
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

function mockAdminUpdate(error: unknown = null) {
    const eq = vi.fn(async () => ({ error }))
    const update = vi.fn(() => ({ eq }))
    mocks.supabaseFrom.mockReturnValue({ update })
    return { update, eq }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.supabaseFrom.mockReset()
})

describe('payment gateway platform actions', () => {
    it('does not expose gateway fetch failures in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const order = vi.fn(async () => ({
            data: null,
            error: {
                message: 'gateway secret-value failed for stripe-secret-id',
                code: '42501',
            },
        }))
        const select = vi.fn(() => ({ order }))
        const from = vi.fn(() => ({ select }))
        mocks.createClient.mockResolvedValue({ from })

        const { getPaymentGateways } = await import('./gateway-actions')
        const result = await getPaymentGateways()

        expect(result).toEqual([])
        expect(from).toHaveBeenCalledWith('payment_gateway_config')

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('stripe-secret-id')
        expect(logText).not.toContain('gateway secret')
        expect(logText).toContain('hasMessage')
    })

    it('does not expose gateway update failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mockAdminUpdate({
            message: 'payment gateway secret-value failed for wompi-secret-id',
            code: '23505',
        })

        const { updatePaymentGateway } = await import('./gateway-actions')
        const result = await updatePaymentGateway('wompi', { is_enabled: true })

        expect(result).toEqual({
            success: false,
            error: 'No se pudo actualizar la pasarela de pago',
        })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('wompi-secret-id')
        expect(logText).not.toContain('payment gateway secret')
        expect(logText).toContain('hasMessage')
    })

    it('keeps successful Stripe connection tests updating the gateway status', async () => {
        vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_secret')
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: vi.fn(async () => ({ id: 'acct_123' })),
        } as any)
        const { update, eq } = mockAdminUpdate(null)

        const { testStripeConnection } = await import('./gateway-actions')
        const result = await testStripeConnection()

        expect(result).toEqual({
            success: true,
            message: 'Conexión exitosa. Cuenta: acct_123',
            accountId: 'acct_123',
        })
        expect(fetchSpy).toHaveBeenCalledWith('https://api.stripe.com/v1/account', {
            headers: {
                Authorization: 'Bearer sk_test_secret',
            },
        })
        expect(update).toHaveBeenCalledWith(expect.objectContaining({
            test_result: 'success',
        }))
        expect(eq).toHaveBeenCalledWith('gateway_name', 'stripe')
    })

    it('does not expose Stripe connection failure details in results, logs, or stored test status', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_secret')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: false,
            json: vi.fn(async () => ({
                error: {
                    message: 'stripe key secret-value rejected for acct_secret',
                },
            })),
        } as any)
        const { update } = mockAdminUpdate(null)

        const { testStripeConnection } = await import('./gateway-actions')
        const result = await testStripeConnection()

        expect(result).toEqual({
            success: false,
            message: 'Error: No se pudo probar la conexión de Stripe',
        })
        expect(update).toHaveBeenCalledWith(expect.objectContaining({
            test_result: 'error: No se pudo probar la conexión de Stripe',
        }))

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('acct_secret')
        expect(logText).not.toContain('stripe key')
        expect(logText).toContain('"name":"Error"')
    })
})
