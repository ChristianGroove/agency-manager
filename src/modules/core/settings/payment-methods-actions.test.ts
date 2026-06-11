import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    revalidatePath: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

function maxOrderQuery(result: { data?: { display_order?: number } | null; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function insertQuery(error: unknown = null) {
    return {
        insert: vi.fn(async () => ({ error })),
    }
}

function filteredMutationQuery(method: 'update' | 'delete', error: unknown = null) {
    const query: any = {
        error,
        eq: vi.fn(() => query),
    }
    query[method] = vi.fn(() => query)
    return query
}

function paymentMethodsListQuery(result: { data?: unknown[] | null; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        order: vi.fn(async () => result),
    }

    return query
}

function createQueuedClient(queries: any[]) {
    return {
        from: vi.fn((table: string) => {
            if (table !== 'organization_payment_methods') {
                throw new Error(`Unexpected table ${table}`)
            }
            const query = queries.shift()
            if (!query) throw new Error('Unexpected organization_payment_methods query')
            return query
        }),
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.revalidatePath.mockReset()
})

describe('payment methods actions', () => {
    it('sanitizes sensitive detail fields when fetching payment methods', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const list = paymentMethodsListQuery({
            data: [
                {
                    id: 'method-1',
                    organization_id: 'org-current',
                    type: 'MANUAL',
                    title: 'Bank transfer',
                    details: {
                        account_number: '123456',
                        public_key: 'pub_123',
                        api_key: 'api-secret-value',
                        nested: {
                            refresh_token: 'refresh-secret-value',
                            note: 'visible note',
                        },
                    },
                    is_active: true,
                    display_order: 1,
                },
                {
                    id: 'method-2',
                    organization_id: 'org-current',
                    type: 'GATEWAY',
                    title: 'Payment link',
                    details: {
                        payment_link: 'https://payments.example/pay',
                        integrity_secret: 'integrity-secret-value',
                    },
                    is_active: true,
                    display_order: 2,
                },
            ],
            error: null,
        })
        const client = createQueuedClient([list])
        mocks.createClient.mockResolvedValue(client)

        const { getPaymentMethods } = await import('./payment-methods-actions')
        const result = await getPaymentMethods()
        const resultText = JSON.stringify(result)

        expect(result[0].details).toEqual({
            account_number: '123456',
            public_key: 'pub_123',
            nested: {
                note: 'visible note',
            },
        })
        expect(result[1].details).toEqual({
            payment_link: 'https://payments.example/pay',
        })
        expect(resultText).not.toContain('api-secret-value')
        expect(resultText).not.toContain('refresh-secret-value')
        expect(resultText).not.toContain('integrity-secret-value')
    })

    it('does not expose fetch failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        const list = paymentMethodsListQuery({
            data: null,
            error: {
                message: 'payment method secret-value fetch failed',
                code: '42501',
            },
        })
        const client = createQueuedClient([list])
        mocks.createClient.mockResolvedValue(client)

        const { getPaymentMethods } = await import('./payment-methods-actions')
        const result = await getPaymentMethods()

        expect(result).toEqual([])
        expect(consoleError).toHaveBeenCalledWith('Error fetching payment methods:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('creates a payment method and preserves settings revalidation', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const maxOrder = maxOrderQuery({ data: { display_order: 2 }, error: null })
        const insert = insertQuery(null)
        const client = createQueuedClient([maxOrder, insert])
        mocks.createClient.mockResolvedValue(client)

        const { createPaymentMethod } = await import('./payment-methods-actions')
        const result = await createPaymentMethod({
            title: 'Wire transfer',
            type: 'MANUAL',
            details: { account_number: '123' },
            instructions: 'Send receipt',
        })

        expect(result).toEqual({ success: true })
        expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({
            organization_id: 'org-current',
            title: 'Wire transfer',
            type: 'MANUAL',
            display_order: 3,
            is_active: true,
        }))
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/settings')
    })

    it('does not expose create persistence failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        const maxOrder = maxOrderQuery({ data: null, error: null })
        const insert = insertQuery({
            message: 'secret-account org-secret-id insert failed',
            code: '42501',
        })
        const client = createQueuedClient([maxOrder, insert])
        mocks.createClient.mockResolvedValue(client)

        const { createPaymentMethod } = await import('./payment-methods-actions')
        const result = await createPaymentMethod({
            title: 'Manual',
            type: 'MANUAL',
            details: {},
        })

        expect(result).toEqual({
            success: false,
            error: 'No se pudo crear el metodo de pago',
        })
        expect(consoleError).toHaveBeenCalledWith('Error creating payment method:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-account')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })

    it('does not expose update failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        const update = filteredMutationQuery('update', {
            message: 'secret-account payment-method-secret update failed',
            code: '42501',
        })
        const client = createQueuedClient([update])
        mocks.createClient.mockResolvedValue(client)

        const { updatePaymentMethod } = await import('./payment-methods-actions')
        const result = await updatePaymentMethod('payment-method-secret', { title: 'Updated' })

        expect(result).toEqual({
            success: false,
            error: 'No se pudo actualizar el metodo de pago',
        })
        expect(consoleError).toHaveBeenCalledWith('Error updating payment method:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-account')
        expect(update.update).toHaveBeenCalledWith({ title: 'Updated' })
        expect(update.eq).toHaveBeenCalledWith('id', 'payment-method-secret')
        expect(update.eq).toHaveBeenCalledWith('organization_id', 'org-secret-id')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })

    it('does not expose delete failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        const remove = filteredMutationQuery('delete', {
            message: 'secret-account payment-method-secret delete failed',
            code: '42501',
        })
        const client = createQueuedClient([remove])
        mocks.createClient.mockResolvedValue(client)

        const { deletePaymentMethod } = await import('./payment-methods-actions')
        const result = await deletePaymentMethod('payment-method-secret')

        expect(result).toEqual({
            success: false,
            error: 'No se pudo eliminar el metodo de pago',
        })
        expect(consoleError).toHaveBeenCalledWith('Error deleting payment method:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-account')
        expect(remove.delete).toHaveBeenCalled()
        expect(remove.eq).toHaveBeenCalledWith('id', 'payment-method-secret')
        expect(remove.eq).toHaveBeenCalledWith('organization_id', 'org-secret-id')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })
})
