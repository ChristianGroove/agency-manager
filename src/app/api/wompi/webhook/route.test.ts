import { createHash } from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    logDomainEvent: vi.fn(),
    performBrandingUpgrade: vi.fn(),
    registerBillableEvent: vi.fn(),
    supabaseFrom: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    },
}))

vi.mock('@/modules/infrastructure/logging/services/event-logger', () => ({
    logDomainEvent: mocks.logDomainEvent,
}))

vi.mock('@/modules/core/branding/tier-actions', () => ({
    performBrandingUpgrade: mocks.performBrandingUpgrade,
}))

vi.mock('@/modules/billing/platform/revenue/actions', () => ({
    registerBillableEvent: mocks.registerBillableEvent,
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

function updateEqResult(result: { error?: unknown } = { error: null }) {
    return {
        update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue(result),
        })),
    }
}

function paymentTransactionBuilder(paymentTx: Record<string, unknown>) {
    return {
        select: vi.fn(() => ({
            eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: paymentTx, error: null }),
            })),
        })),
        update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
        })),
    }
}

function signedWompiRequest(transaction: Record<string, unknown>, secret = 'events-secret') {
    const timestamp = '1710000000000'
    const signatureString = `${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}${secret}`
    const checksum = createHash('sha256').update(signatureString).digest('hex')

    return new Request('https://pixy.test/api/wompi/webhook', {
        method: 'POST',
        body: JSON.stringify({
            data: { transaction },
            signature: { checksum },
            timestamp,
            environment: 'sandbox',
        }),
    })
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.logDomainEvent.mockReset()
    mocks.performBrandingUpgrade.mockReset()
    mocks.registerBillableEvent.mockReset()
    mocks.supabaseFrom.mockReset()
})

describe('/api/wompi/webhook', () => {
    it('does not expose internal branding upgrade failures in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('WOMPI_EVENTS_SECRET', 'events-secret')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)

        const transaction = {
            id: 'tx-1',
            status: 'APPROVED',
            amount_in_cents: 120000,
            reference: 'PAY-1710000000000-TEST',
            redirect_url: 'https://checkout.wompi.co/sandbox',
        }

        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'organization_settings') {
                return updateEqResult()
            }

            if (table === 'payment_transactions') {
                return paymentTransactionBuilder({
                    id: 'payment-tx-1',
                    amount_in_cents: transaction.amount_in_cents,
                    currency: 'COP',
                    invoice_ids: [],
                    organization_id: 'org-1',
                    metadata: {
                        type: 'branding_upgrade',
                        target_tier: 'whitelabel',
                    },
                })
            }

            return updateEqResult()
        })

        mocks.performBrandingUpgrade.mockResolvedValue({
            success: false,
            error: 'wompi integrity secret-value failed during branding upgrade',
        })

        const { POST } = await import('./route')
        const response = await POST(signedWompiRequest(transaction))
        const responseText = await response.text()

        expect(response.status).toBe(200)
        expect(responseText).toContain('"success":true')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('integrity')
    })
})
