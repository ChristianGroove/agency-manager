import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    supabaseAdmin: {
        from: vi.fn(),
    },
    InvoiceMapper: {
        legacyToCore: vi.fn(),
        coreToLegacy: vi.fn(),
    },
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: mocks.supabaseAdmin,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/billing/legacy/InvoiceMapper', () => ({
    InvoiceMapper: mocks.InvoiceMapper,
}))

function secretError(message = 'billing secret-value failure') {
    return {
        message,
        code: '42501',
        status: 403,
    }
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

function updateSelectSingle(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        update: vi.fn(() => query),
        eq: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function updateInEq(error: unknown = null) {
    const query: any = {
        update: vi.fn(() => query),
        in: vi.fn(() => query),
        eq: vi.fn(async () => ({ error })),
    }

    return query
}

function insertSelectSingle(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        insert: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function selectEqSingle(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function authenticatedClient(queues: Record<string, any[]> = {}) {
    return createQueuedClient(queues, {
        auth: {
            getUser: vi.fn(async () => ({ data: { user: { id: 'user-current' } } })),
        },
    })
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.supabaseAdmin.from.mockReset()
    mocks.InvoiceMapper.legacyToCore.mockReset()
    mocks.InvoiceMapper.coreToLegacy.mockReset()
})

async function importBillingService() {
    mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
    return import('../billing-service')
}

describe('BillingService sanitized errors', () => {
    it('does not expose invoice creation failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue(authenticatedClient())
        mocks.InvoiceMapper.legacyToCore.mockImplementation(() => {
            throw new Error('invoice secret-value mapper failure')
        })

        const { createInvoice } = await importBillingService()
        const result = await createInvoice({ items: [] } as any)

        expect(result).toEqual({ success: false, error: 'No se pudo crear la factura' })
        expect(consoleError).toHaveBeenCalledWith('[BillingService.createInvoice] Error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not create invoices for clients outside the current organization', async () => {
        const clientLookup = selectEqSingle({
            data: null,
            error: { code: 'PGRST116', message: 'No rows' },
        })
        const invoiceInsert = insertSelectSingle({
            data: { id: 'invoice-1' },
            error: null,
        })
        mocks.createClient.mockResolvedValue(authenticatedClient({
            leads: [clientLookup],
            invoices: [invoiceInsert],
        }))

        const { createInvoice } = await importBillingService()
        const result = await createInvoice({
            client_id: 'client-other-org',
            items: [],
        } as any)

        expect(result).toEqual({ success: false, error: 'No se pudo crear la factura' })
        expect(clientLookup.eq).toHaveBeenCalledWith('id', 'client-other-org')
        expect(clientLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(invoiceInsert.insert).not.toHaveBeenCalled()
        expect(mocks.InvoiceMapper.legacyToCore).not.toHaveBeenCalled()
    })

    it('does not create invoices for billing cycles outside the current organization service scope', async () => {
        const cycleLookup = selectEqSingle({
            data: null,
            error: { code: 'PGRST116', message: 'No rows' },
        })
        const invoiceInsert = insertSelectSingle({
            data: { id: 'invoice-1' },
            error: null,
        })
        mocks.createClient.mockResolvedValue(authenticatedClient({
            billing_cycles: [cycleLookup],
            invoices: [invoiceInsert],
        }))

        const { createInvoice } = await importBillingService()
        const result = await createInvoice({
            cycle_id: 'cycle-other-org',
            items: [],
        } as any)

        expect(result).toEqual({ success: false, error: 'No se pudo crear la factura' })
        expect(cycleLookup.eq).toHaveBeenCalledWith('id', 'cycle-other-org')
        expect(cycleLookup.eq).toHaveBeenCalledWith('service.organization_id', 'org-current')
        expect(invoiceInsert.insert).not.toHaveBeenCalled()
        expect(mocks.InvoiceMapper.legacyToCore).not.toHaveBeenCalled()
    })

    it('updates invoices without changing the success contract', async () => {
        const update = updateSelectSingle({
            data: { id: 'invoice-1', status: 'paid' },
            error: null,
        })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            invoices: [update],
        }))

        const { updateInvoice } = await importBillingService()
        const result = await updateInvoice('invoice-1', { status: 'paid' } as any)

        expect(result).toEqual({
            success: true,
            data: { id: 'invoice-1', status: 'paid' },
        })
        expect(update.update).toHaveBeenCalledWith({ status: 'paid' })
        expect(update.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('does not expose invoice update failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const update = updateSelectSingle({
            data: null,
            error: secretError('invoice secret-value update failed'),
        })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            invoices: [update],
        }))

        const { updateInvoice } = await importBillingService()
        const result = await updateInvoice('invoice-secret-id', { status: 'paid' } as any)

        expect(result).toEqual({ success: false, error: 'No se pudo actualizar la factura' })
        expect(consoleError).toHaveBeenCalledWith('[BillingService.updateInvoice] Error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose invoice deletion failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const remove = updateInEq(secretError('invoice secret-value delete failed'))
        mocks.createClient.mockResolvedValue(createQueuedClient({
            invoices: [remove],
        }))

        const { deleteInvoices } = await importBillingService()
        const result = await deleteInvoices(['invoice-secret-id'])

        expect(result).toEqual({ success: false, error: 'No se pudieron eliminar las facturas' })
        expect(consoleError).toHaveBeenCalledWith('[BillingService.deleteInvoices] Error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose service registration failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const insert = insertSelectSingle({
            data: null,
            error: secretError('service secret-value insert failed'),
        })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            services: [insert],
        }))

        const { registerService } = await importBillingService()
        const result = await registerService({ name: 'Hosting' })

        expect(result).toEqual({ success: false, error: 'No se pudo registrar el servicio' })
        expect(consoleError).toHaveBeenCalledWith('[BillingService.registerService] Error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose service status failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const update = updateSelectSingle({
            data: null,
            error: secretError('service secret-value status failed'),
        })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            services: [update],
        }))

        const { toggleServiceStatus } = await importBillingService()
        const result = await toggleServiceStatus('service-secret-id', 'paused')

        expect(result).toEqual({ success: false, error: 'No se pudo actualizar el servicio' })
        expect(consoleError).toHaveBeenCalledWith('[BillingService.toggleServiceStatus] Error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose public invoice fetch failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const invoice = selectEqSingle({
            data: null,
            error: secretError('public invoice secret-value fetch failed'),
        })
        mocks.supabaseAdmin.from.mockImplementation(createQueuedClient({
            invoices: [invoice],
        }).from)

        const { getPublicInvoice } = await importBillingService()
        const result = await getPublicInvoice('invoice-secret-id')

        expect(result).toEqual({ error: 'No se pudo cargar la factura' })
        expect(consoleError).toHaveBeenCalledWith('[BillingService.getPublicInvoice] Error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('keeps the public invoice not-found contract without logging internals', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const invoice = selectEqSingle({
            data: null,
            error: null,
        })
        mocks.supabaseAdmin.from.mockImplementation(createQueuedClient({
            invoices: [invoice],
        }).from)

        const { getPublicInvoice } = await importBillingService()
        const result = await getPublicInvoice('missing-invoice')

        expect(result).toEqual({ error: 'Invoice not found' })
        expect(consoleError).not.toHaveBeenCalled()
    })
})
