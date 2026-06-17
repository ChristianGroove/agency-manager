import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    isSuperAdmin: vi.fn(),
    requireSuperAdmin: vi.fn(),
    generatePlatformInvoicePDF: vi.fn(),
    EmailService: {
        send: vi.fn(),
    },
    from: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/iam/services/platform-roles', () => ({
    isSuperAdmin: mocks.isSuperAdmin,
    requireSuperAdmin: mocks.requireSuperAdmin,
}))

vi.mock('@/modules/infrastructure/pdf/services/platform-pdf-generator', () => ({
    generatePlatformInvoicePDF: mocks.generatePlatformInvoicePDF,
}))

vi.mock('@/modules/features/notifications/email.service', () => ({
    EmailService: mocks.EmailService,
}))

function authClient(userId = 'admin-user') {
    return {
        auth: {
            getUser: vi.fn(async () => ({
                data: { user: { id: userId } },
            })),
        },
        from: mocks.from,
    }
}

function insertSelectSingleQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        insert: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function upsertThrowQuery(error: unknown) {
    return {
        upsert: vi.fn(async () => {
            throw error
        }),
    }
}

function selectEqSingleQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function selectEqMaybeSingleQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        or: vi.fn(() => query),
        limit: vi.fn(() => query),
        maybeSingle: vi.fn(async () => result),
    }

    return query
}

function orderedListQuery(data: unknown[] = []) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        order: vi.fn(async () => ({ data })),
    }

    return query
}

function upsertImmediateQuery(error: unknown = null) {
    return {
        upsert: vi.fn(async () => ({ error })),
    }
}

function createQueuedAdmin(queues: Record<string, any[]>) {
    mocks.from.mockImplementation((table: string) => {
        const queue = queues[table]
        if (!queue?.length) throw new Error(`Unexpected table ${table}`)
        return queue.shift()
    })
}

function platformInvoice(overrides: Record<string, unknown> = {}) {
    return {
        id: 'invoice-1',
        invoice_number: 'PLAT-001',
        organization_id: 'org-secret-id',
        organization: { name: 'Client Org' },
        amount_total: 100,
        currency: 'USD',
        billing_period_start: '2026-01-01',
        created_at: '2026-01-10T00:00:00Z',
        client_tax_id: '',
        client_address: '',
        client_legal_name: '',
        include_tax: false,
        tax_rate: 0,
        tax_amount: 0,
        amount_subtotal: 100,
        recipient_email: 'billing@example.com',
        ...overrides,
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.isSuperAdmin.mockReset()
    mocks.requireSuperAdmin.mockReset()
    mocks.generatePlatformInvoicePDF.mockReset()
    mocks.EmailService.send.mockReset()
    mocks.from.mockReset()
})

describe('PlatformBillingService sanitized errors', () => {
    it('continues creating a platform invoice when billing profile upsert fails without leaking logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue(authClient())
        mocks.isSuperAdmin.mockResolvedValue(true)

        const profileUpsert = upsertThrowQuery(new Error('profile secret-value failed'))
        const invoiceInsert = insertSelectSingleQuery({
            data: platformInvoice(),
            error: null,
        })
        createQueuedAdmin({
            organization_billing_profiles: [profileUpsert],
            saas_platform_invoices: [invoiceInsert],
        })

        const { PlatformBillingService } = await import('../platform-billing-service')
        const result = await PlatformBillingService.createManualPlatformInvoice({
            organizationId: 'org-secret-id',
            amount: 100,
            billingPeriodStart: '2026-01-01',
            billingPeriodEnd: '2026-01-31',
            clientTaxId: 'tax-secret',
        })

        expect(result.success).toBe(true)
        expect(consoleError).toHaveBeenCalledWith(
            'Warning: Profile upsert failed (continuing invoice creation):',
            { name: 'Error' },
        )
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    }, 15000)

    it('does not expose platform invoice creation failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue(authClient())
        mocks.isSuperAdmin.mockResolvedValue(true)

        const invoiceInsert = insertSelectSingleQuery({
            data: null,
            error: {
                message: 'platform invoice secret-value failed',
                code: '42501',
            },
        })
        createQueuedAdmin({
            saas_platform_invoices: [invoiceInsert],
        })

        const { PlatformBillingService } = await import('../platform-billing-service')
        const result = await PlatformBillingService.createManualPlatformInvoice({
            organizationId: 'org-secret-id',
            amount: 100,
            billingPeriodStart: '2026-01-01',
            billingPeriodEnd: '2026-01-31',
        })

        expect(result).toEqual({
            success: false,
            error: 'No se pudo crear la factura de plataforma',
        })
        expect(consoleError).toHaveBeenCalledWith('Full error creating platform invoice:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    }, 15000)

    it('does not expose platform invoice email provider failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('RESEND_API_KEY', 'resend-key')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue(authClient())
        mocks.generatePlatformInvoicePDF.mockResolvedValue({
            arrayBuffer: vi.fn(async () => new Uint8Array([1, 2, 3]).buffer),
        })
        mocks.EmailService.send.mockResolvedValue({
            success: false,
            error: 'email provider secret-value failed',
        })

        createQueuedAdmin({
            saas_platform_invoices: [selectEqSingleQuery({
                data: platformInvoice(),
                error: null,
            })],
            organizations: [selectEqSingleQuery({
                data: { id: 'platform-org-id' },
                error: null,
            })],
            organization_payment_methods: [orderedListQuery([])],
        })

        const { PlatformBillingService } = await import('../platform-billing-service')
        const result = await PlatformBillingService.sendPlatformInvoiceEmail('invoice-secret-id', 'billing@example.com')

        expect(result).toEqual({
            success: false,
            error: 'No se pudo enviar la factura de plataforma',
        })
        expect(consoleError).toHaveBeenCalledWith('[PlatformBilling] Email send failed:', { type: 'string' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    }, 15000)

    it('sanitizes platform payment method details before email and PDF rendering', async () => {
        vi.stubEnv('RESEND_API_KEY', 'resend-key')
        mocks.createClient.mockResolvedValue(authClient())
        mocks.generatePlatformInvoicePDF.mockResolvedValue({
            arrayBuffer: vi.fn(async () => new Uint8Array([1, 2, 3]).buffer),
        })
        mocks.EmailService.send.mockResolvedValue({ success: true })

        createQueuedAdmin({
            saas_platform_invoices: [selectEqSingleQuery({
                data: platformInvoice(),
                error: null,
            })],
            organizations: [selectEqSingleQuery({
                data: { id: 'platform-org-id' },
                error: null,
            })],
            organization_payment_methods: [orderedListQuery([
                {
                    id: 'method-1',
                    type: 'MANUAL',
                    title: 'Bank transfer',
                    details: {
                        account_number: '123456',
                        api_key: 'api-secret-value',
                        nested: {
                            access_token: 'token-secret-value',
                            note: 'visible note',
                        },
                    },
                    instructions: 'Send receipt',
                },
            ])],
        })

        const { PlatformBillingService } = await import('../platform-billing-service')
        const result = await PlatformBillingService.sendPlatformInvoiceEmail('invoice-secret-id', 'billing@example.com')
        const pdfPayload = mocks.generatePlatformInvoicePDF.mock.calls[0][0]
        const emailPayload = mocks.EmailService.send.mock.calls[0][0]
        const renderedOutput = JSON.stringify({ pdfPayload, html: emailPayload.html })

        expect(result).toEqual({ success: true })
        expect(renderedOutput).toContain('123456')
        expect(renderedOutput).not.toContain('api-secret-value')
        expect(renderedOutput).not.toContain('token-secret-value')
    }, 15000)

    it('does not expose manual subscription activation failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue(authClient())

        createQueuedAdmin({
            organizations: [selectEqSingleQuery({
                data: {
                    name: 'Client Org',
                    subscription_product_id: null,
                    active_app_id: 'app-starter',
                },
                error: null,
            })],
            saas_products: [selectEqMaybeSingleQuery({
                data: { id: 'product-1', slug: 'starter' },
                error: null,
            })],
            saas_subscriptions: [
                selectEqMaybeSingleQuery({
                    data: { plan_id: 'starter' },
                    error: null,
                }),
                upsertImmediateQuery({
                    message: 'activation secret-value failed',
                    code: '42501',
                }),
            ],
        })

        const { PlatformBillingService } = await import('../platform-billing-service')
        const result = await PlatformBillingService.manualActivateSubscription('org-secret-id', { monthsToAdd: 1 })

        expect(result).toEqual({
            success: false,
            error: 'No se pudo activar la suscripcion',
        })
        expect(consoleError).toHaveBeenCalledWith('[PlatformBilling.manualActivateSubscription] Error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    }, 15000)
})
