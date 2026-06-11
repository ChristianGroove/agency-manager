import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    getCurrentOrganizationApp: vi.fn(),
    logDomainEvent: vi.fn(),
    getActiveProcess: vi.fn(),
    transitionProcess: vi.fn(),
    supabaseAdmin: {
        from: vi.fn(),
    },
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: mocks.supabaseAdmin,
}))

vi.mock('@/modules/infrastructure/logging/services/event-logger', () => ({
    logDomainEvent: mocks.logDomainEvent,
}))

vi.mock('@/modules/core/saas/app-data-actions', () => ({
    getCurrentOrganizationApp: mocks.getCurrentOrganizationApp,
}))

vi.mock('@/modules/features/crm/services/process-engine/engine', () => ({
    ProcessEngine: {
        getActiveProcess: mocks.getActiveProcess,
        transition: mocks.transitionProcess,
    },
}))

function selectSingleQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function selectMaybeSingleQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        maybeSingle: vi.fn(async () => result),
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

function insertImmediateQuery(error: unknown = null) {
    return {
        insert: vi.fn(async () => ({ error })),
    }
}

function insertSelectSingleQuery(result: { data?: unknown; error?: unknown }) {
    const single = vi.fn(async () => result)
    const select = vi.fn(() => ({ single }))

    return {
        insert: vi.fn(() => ({ select })),
        select,
        single,
    }
}

function createQueuedClient(queues: Record<string, any[]>) {
    return {
        from: vi.fn((table: string) => {
            const queue = queues[table]
            if (!queue?.length) throw new Error(`Unexpected table ${table}`)
            return queue.shift()
        }),
    }
}

function useQueuedAdmin(queues: Record<string, any[]>) {
    const tableQueues = Object.fromEntries(
        Object.entries(queues).map(([table, tableQueue]) => [table, [...tableQueue]])
    )

    mocks.supabaseAdmin.from.mockImplementation((table: string) => {
        const queue = tableQueues[table]
        if (!queue?.length) throw new Error(`Unexpected admin table ${table}`)
        return queue.shift()
    })
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.getCurrentOrganizationApp.mockReset()
    mocks.logDomainEvent.mockReset()
    mocks.getActiveProcess.mockReset()
    mocks.transitionProcess.mockReset()
    mocks.supabaseAdmin.from.mockReset()
})

describe('PaymentService', () => {
    it('registers a partial manual payment without changing the success contract', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.logDomainEvent.mockResolvedValue(undefined)

        const invoiceFetch = selectSingleQuery({
            data: {
                id: 'invoice-1',
                total: 1000,
                currency: 'COP',
                status: 'sent',
            },
            error: null,
        })
        const invoiceUpdate = updateFilterQuery(null)
        const client = createQueuedClient({
            invoices: [invoiceFetch, invoiceUpdate],
        })
        mocks.createClient.mockResolvedValue(client)

        const transactionInsert = insertImmediateQuery(null)
        mocks.supabaseAdmin.from.mockReturnValue(transactionInsert)

        const { registerPayment } = await import('../payment-service')
        const result = await registerPayment('invoice-1', 500, 'receipt ok')

        expect(result).toEqual({ success: true })
        expect(invoiceFetch.eq).toHaveBeenCalledWith('id', 'invoice-1')
        expect(invoiceFetch.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(transactionInsert.insert).toHaveBeenCalledWith(expect.objectContaining({
            amount_in_cents: 50000,
            currency: 'COP',
            invoice_ids: ['invoice-1'],
            organization_id: 'org-current',
            status: 'APPROVED',
            metadata: { notes: 'receipt ok' },
        }))
        expect(invoiceUpdate.update).toHaveBeenCalledWith(expect.objectContaining({
            payment_status: 'PARTIALLY_PAID',
            status: 'sent',
        }))
        expect(mocks.logDomainEvent).toHaveBeenCalledWith(expect.objectContaining({
            entity_type: 'invoice',
            entity_id: 'invoice-1',
            event_type: 'invoice.payment_registered',
        }))
    })

    it('does not register manual payments for invoices outside the current organization', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')

        const invoiceFetch = selectSingleQuery({
            data: null,
            error: { code: 'PGRST116', message: 'No rows' },
        })
        const client = createQueuedClient({
            invoices: [invoiceFetch],
        })
        mocks.createClient.mockResolvedValue(client)

        const { registerPayment } = await import('../payment-service')
        const result = await registerPayment('invoice-other-org', 500, 'receipt ok')

        expect(result).toEqual({ success: false, error: 'No se pudo registrar el pago' })
        expect(invoiceFetch.eq).toHaveBeenCalledWith('id', 'invoice-other-org')
        expect(invoiceFetch.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.supabaseAdmin.from).not.toHaveBeenCalled()
        expect(mocks.logDomainEvent).not.toHaveBeenCalled()
        expect(consoleError).toHaveBeenCalled()
    })

    it('scopes paid invoice process transitions to the current organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.logDomainEvent.mockResolvedValue(undefined)
        mocks.getActiveProcess.mockResolvedValue({ id: 'process-1' })
        mocks.transitionProcess.mockResolvedValue({ success: true })

        const invoiceFetch = selectSingleQuery({
            data: {
                id: 'invoice-1',
                total: 1000,
                currency: 'COP',
                status: 'sent',
            },
            error: null,
        })
        const invoiceUpdate = updateFilterQuery(null)
        const transitionInvoiceFetch = selectSingleQuery({
            data: {
                id: 'invoice-1',
                lead_id: 'lead-current',
                metadata: {},
                client: null,
            },
            error: null,
        })
        const leadLookup = selectMaybeSingleQuery({
            data: { id: 'lead-current' },
            error: null,
        })
        const client = createQueuedClient({
            invoices: [invoiceFetch, invoiceUpdate, transitionInvoiceFetch],
            leads: [leadLookup],
        })
        mocks.createClient.mockResolvedValue(client)

        const transactionInsert = insertImmediateQuery(null)
        const processMapLookup = selectMaybeSingleQuery({
            data: { pipeline_stage_id: 'stage-won' },
            error: null,
        })
        const stageLookup = selectSingleQuery({
            data: { status_key: 'won' },
            error: null,
        })
        const leadUpdate = updateFilterQuery(null)
        useQueuedAdmin({
            payment_transactions: [transactionInsert],
            pipeline_process_map: [processMapLookup],
            pipeline_stages: [stageLookup],
            leads: [leadUpdate],
        })

        const { registerPayment } = await import('../payment-service')
        const result = await registerPayment('invoice-1', 1000, 'paid in full')

        expect(result).toEqual({ success: true })
        expect(transitionInvoiceFetch.eq).toHaveBeenCalledWith('id', 'invoice-1')
        expect(transitionInvoiceFetch.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(leadLookup.eq).toHaveBeenCalledWith('id', 'lead-current')
        expect(leadLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.getActiveProcess).toHaveBeenCalledWith('lead-current', 'sale')
        expect(processMapLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(leadUpdate.update).toHaveBeenCalledWith({ status: 'won' })
        expect(leadUpdate.eq).toHaveBeenCalledWith('id', 'lead-current')
        expect(leadUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('does not expose manual payment failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')

        const invoiceFetch = selectSingleQuery({
            data: {
                id: 'invoice-secret',
                total: 1000,
                currency: 'COP',
                status: 'sent',
            },
            error: null,
        })
        const client = createQueuedClient({
            invoices: [invoiceFetch],
        })
        mocks.createClient.mockResolvedValue(client)

        const transactionInsert = insertImmediateQuery({
            message: 'payment secret-value failed for invoice-secret',
            code: '42501',
        })
        mocks.supabaseAdmin.from.mockReturnValue(transactionInsert)

        const { registerPayment } = await import('../payment-service')
        const result = await registerPayment('invoice-secret', 500, 'secret note')

        expect(result).toEqual({
            success: false,
            error: 'No se pudo registrar el pago',
        })
        expect(consoleError).toHaveBeenCalledWith('[PaymentService.registerPayment] Error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('updates a gateway without changing the success contract', async () => {
        const update = updateFilterQuery(null)
        mocks.supabaseAdmin.from.mockReturnValue(update)

        const { updatePaymentGateway } = await import('../payment-service')
        const result = await updatePaymentGateway('wompi', { is_enabled: true })

        expect(result).toEqual({ success: true })
        expect(update.update).toHaveBeenCalledWith(expect.objectContaining({
            is_enabled: true,
            updated_at: expect.any(String),
        }))
        expect(update.eq).toHaveBeenCalledWith('gateway_name', 'wompi')
    })

    it('does not expose gateway update failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const update = updateFilterQuery({
            message: 'gateway secret-value failed',
            code: '42501',
        })
        mocks.supabaseAdmin.from.mockReturnValue(update)

        const { updatePaymentGateway } = await import('../payment-service')
        const result = await updatePaymentGateway('wompi', { is_enabled: true })

        expect(result).toEqual({
            success: false,
            error: 'No se pudo actualizar la pasarela de pago',
        })
        expect(consoleError).toHaveBeenCalledWith('[PaymentService.updatePaymentGateway] Error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('creates a subscription payment transaction without changing the success payload', async () => {
        vi.stubEnv('WOMPI_INTEGRITY_SECRET', 'integrity-secret')
        vi.stubEnv('NEXT_PUBLIC_WOMPI_PUBLIC_KEY', 'pub_test')
        vi.spyOn(Date, 'now').mockReturnValue(1700000000000)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        mocks.getCurrentOrganizationApp.mockResolvedValue({
            app: {
                id: 'app-starter',
                name: 'Starter',
                price_monthly: 29,
            },
        })

        const transactionInsert = insertSelectSingleQuery({
            data: { id: 'tx-1' },
            error: null,
        })
        mocks.supabaseAdmin.from.mockReturnValue(transactionInsert)

        const { createSubscriptionPaymentTransaction } = await import('../payment-service')
        const result = await createSubscriptionPaymentTransaction()

        expect(result).toEqual(expect.objectContaining({
            success: true,
            reference: 'SUBSCRIPTION-PAY-org-secr-1700000000000',
            amountInCents: 2900,
            currency: 'USD',
            publicKey: 'pub_test',
            signature: expect.stringMatching(/^[a-f0-9]{64}$/),
        }))
        expect(transactionInsert.insert).toHaveBeenCalledWith(expect.objectContaining({
            organization_id: 'org-secret-id',
            reference: 'SUBSCRIPTION-PAY-org-secr-1700000000000',
            amount_in_cents: 2900,
            status: 'PENDING',
            metadata: expect.objectContaining({
                type: 'subscription_payment',
                app_id: 'app-starter',
            }),
        }))
    })

    it('does not expose subscription transaction failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        mocks.getCurrentOrganizationApp.mockResolvedValue({
            app: {
                id: 'app-starter',
                name: 'Starter',
                price_monthly: 29,
            },
        })

        const transactionInsert = insertSelectSingleQuery({
            data: null,
            error: {
                message: 'subscription secret-value failed for org-secret-id',
                code: '42501',
            },
        })
        mocks.supabaseAdmin.from.mockReturnValue(transactionInsert)

        const { createSubscriptionPaymentTransaction } = await import('../payment-service')

        await expect(createSubscriptionPaymentTransaction()).rejects.toThrow('No se pudo iniciar el pago')
        expect(consoleError).toHaveBeenCalledWith('[PaymentService.createSubscriptionPaymentTransaction] Error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })
})
