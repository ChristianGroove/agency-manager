import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    revalidatePath: vi.fn(),
    getActiveEmitters: vi.fn(),
    getSettings: vi.fn(),
    getContactOptions: vi.fn(),
    deleteInvoices: vi.fn(),
    deleteServices: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/modules/core/settings/emitters-actions', () => ({
    getActiveEmitters: mocks.getActiveEmitters,
}))

vi.mock('@/modules/core/settings/actions/crud', () => ({
    getSettings: mocks.getSettings,
}))

vi.mock('./services/billing-service', () => ({
    createInvoice: vi.fn(),
    getInvoices: vi.fn(),
    getInvoiceById: vi.fn(),
    getPublicInvoice: vi.fn(),
    getContactOptions: mocks.getContactOptions,
    deleteInvoices: mocks.deleteInvoices,
    registerService: vi.fn(),
    toggleServiceStatus: vi.fn(),
    deleteServices: mocks.deleteServices,
}))

vi.mock('./services/payment-service', () => ({
    registerPayment: vi.fn(),
    createSubscriptionPaymentTransaction: vi.fn(),
    getSubscriptionHistory: vi.fn(),
    getPaymentTransactions: vi.fn(),
}))

vi.mock('./services/revenue-service', () => ({
    getRevenueMetrics: vi.fn(),
}))

vi.mock('./services/platform-billing-service', () => ({
    PlatformBillingService: {
        createManualPlatformInvoice: vi.fn(),
        getPlatformInvoices: vi.fn(),
        deletePlatformInvoice: vi.fn(),
        manualActivateSubscription: vi.fn(),
        suspendOrganizationSubscription: vi.fn(),
        sendPlatformInvoiceEmail: vi.fn(),
        getPlatformPaymentMethods: vi.fn(),
    },
}))

vi.mock('./services/validate-document-action', () => ({
    validateInvoiceDraft: vi.fn(),
}))

vi.mock('./services/send-invoice-email', () => ({
    sendInvoiceEmail: vi.fn(),
}))

vi.mock('./services/get-audit-logs', () => ({
    getAuditLogs: vi.fn(),
}))

vi.mock('./services/get-fiscal-documents', () => ({
    getFiscalDocuments: vi.fn(),
}))

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.getActiveEmitters.mockReset()
    mocks.getSettings.mockReset()
    mocks.getContactOptions.mockReset()
    mocks.deleteInvoices.mockReset()
    mocks.deleteServices.mockReset()
})

describe('billing server actions sanitized errors', () => {
    it('deletes invoices through the scoped billing service and preserves revalidation on success', async () => {
        mocks.deleteInvoices.mockResolvedValue({ success: true })

        const { deleteInvoicesAction } = await import('./billing-actions')
        const result = await deleteInvoicesAction(['invoice-1'])

        expect(result).toEqual({ success: true, error: undefined })
        expect(mocks.deleteInvoices).toHaveBeenCalledWith(['invoice-1'])
        expect(mocks.createClient).not.toHaveBeenCalled()
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/billing')
    })

    it('does not expose invoice delete failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        mocks.deleteInvoices.mockResolvedValue({
            success: false,
            error: 'No se pudieron eliminar las facturas',
        })

        const { deleteInvoicesAction } = await import('./billing-actions')
        const result = await deleteInvoicesAction(['invoice-secret-id'])

        expect(result).toEqual({
            success: false,
            error: 'No se pudieron eliminar las facturas',
        })
        expect(mocks.deleteInvoices).toHaveBeenCalledWith(['invoice-secret-id'])
        expect(mocks.createClient).not.toHaveBeenCalled()
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })

    it('does not expose service delete failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        mocks.deleteServices.mockResolvedValue({
            success: false,
            error: 'No se pudieron eliminar los servicios',
        })

        const { deleteServicesAction } = await import('./billing-actions')
        const result = await deleteServicesAction(['service-secret-id'])

        expect(result).toEqual({
            success: false,
            error: 'No se pudieron eliminar los servicios',
        })
        expect(mocks.deleteServices).toHaveBeenCalledWith(['service-secret-id'])
        expect(mocks.createClient).not.toHaveBeenCalled()
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })

    it('does not expose emitter loading exceptions in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        mocks.getActiveEmitters.mockRejectedValue(new Error('emitters secret-value failed'))

        const { getEmittersAction } = await import('./billing-actions')
        const result = await getEmittersAction()

        expect(result).toEqual({
            success: false,
            error: 'No se pudieron cargar los emisores',
        })
    })

    it('does not expose settings loading exceptions in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        mocks.getSettings.mockRejectedValue(new Error('settings secret-value failed'))

        const { getSettingsAction } = await import('./billing-actions')
        const result = await getSettingsAction()

        expect(result).toEqual({
            success: false,
            error: 'No se pudo cargar la configuracion',
        })
    })

    it('does not expose contact option loading exceptions in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        mocks.getContactOptions.mockRejectedValue(new Error('contacts secret-value failed'))

        const { getContactOptionsAction } = await import('./billing-actions')
        const result = await getContactOptionsAction()

        expect(result).toEqual({
            success: false,
            error: 'No se pudieron cargar las opciones de contacto',
        })
    })
})
