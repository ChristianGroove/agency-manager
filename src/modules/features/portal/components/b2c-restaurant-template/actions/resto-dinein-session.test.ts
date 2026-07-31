import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    revalidatePath: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.from,
    }
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

function createQueryChain(result: { data?: any; error?: any }) {
    const chain: any = {}
    chain.select = vi.fn(() => chain)
    chain.insert = vi.fn(() => chain)
    chain.update = vi.fn(() => chain)
    chain.delete = vi.fn(() => chain)
    chain.eq = vi.fn(() => chain)
    chain.or = vi.fn(() => chain)
    chain.limit = vi.fn(() => chain)
    chain.order = vi.fn(() => chain)
    chain.single = vi.fn(async () => result)
    chain.maybeSingle = vi.fn(async () => result)
    chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
    return chain
}

function useTableQueues(queues: Record<string, any[]>) {
    const tableQueues = Object.fromEntries(
        Object.entries(queues).map(([table, tableQueue]) => [table, [...tableQueue]])
    )

    mocks.from.mockImplementation((table: string) => {
        const queue = tableQueues[table]
        if (!queue?.length) {
            throw new Error(`Unexpected table call: ${table}`)
        }
        return queue.shift()
    })
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.from.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.revalidatePath.mockReset()
})

describe('Table & Session Operational Flow', () => {
    const ORG_ID = 'org-resto-777'
    const TABLE_ID = 'table-m01-id'
    const SESSION_ID = 'session-999-id'

    describe('Table QR Validation & Session Binding (validateTableQR)', () => {
        it('validates QR token for an available table, creates a new session, binds primary waiter, and marks table occupied', async () => {
            const tableLookup = createQueryChain({
                data: {
                    id: TABLE_ID,
                    table_identifier: 'MESA-01',
                    status: 'available',
                    current_session_id: null,
                    zone_id: 'zone-patio',
                },
                error: null,
            })

            const primaryWaiterLookup = createQueryChain({
                data: { staff_id: 'waiter-primary-001' },
                error: null,
            })

            const sessionInsert = createQueryChain({
                data: { id: SESSION_ID },
                error: null,
            })

            const tableStatusUpdate = createQueryChain({
                data: null,
                error: null,
            })

            useTableQueues({
                resto_tables: [tableLookup, tableStatusUpdate],
                resto_staff_zone_assignments: [primaryWaiterLookup],
                resto_table_sessions: [sessionInsert],
            })

            const { validateTableQR } = await import('./resto-dinein-actions')
            const result = await validateTableQR(ORG_ID, 'qr-token-table-01')

            expect(result.success).toBe(true)
            expect(result.tableId).toBe(TABLE_ID)
            expect(result.tableIdentifier).toBe('MESA-01')
            expect(result.sessionId).toBe(SESSION_ID)

            expect(sessionInsert.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    organization_id: ORG_ID,
                    table_id: TABLE_ID,
                    status: 'active',
                    waiter_id: 'waiter-primary-001',
                })
            )
            expect(tableStatusUpdate.update).toHaveBeenCalledWith({
                status: 'occupied',
                current_session_id: SESSION_ID,
            })
            expect(tableStatusUpdate.eq).toHaveBeenCalledWith('id', TABLE_ID)
        })

        it('binds multi-guest scanning to existing active session when table is occupied', async () => {
            const tableLookup = createQueryChain({
                data: {
                    id: TABLE_ID,
                    table_identifier: 'MESA-01',
                    status: 'occupied',
                    current_session_id: SESSION_ID,
                    zone_id: 'zone-patio',
                },
                error: null,
            })

            useTableQueues({
                resto_tables: [tableLookup],
            })

            const { validateTableQR } = await import('./resto-dinein-actions')
            const result = await validateTableQR(ORG_ID, 'qr-token-table-01')

            expect(result.success).toBe(true)
            expect(result.tableId).toBe(TABLE_ID)
            expect(result.tableIdentifier).toBe('MESA-01')
            expect(result.sessionId).toBe(SESSION_ID)
            // Does not create a new session
            expect(mocks.from).toHaveBeenCalledTimes(1)
        })

        it('rejects QR validation when table status is cleaning', async () => {
            const tableLookup = createQueryChain({
                data: {
                    id: TABLE_ID,
                    table_identifier: 'MESA-01',
                    status: 'cleaning',
                    current_session_id: null,
                },
                error: null,
            })

            useTableQueues({
                resto_tables: [tableLookup],
            })

            const { validateTableQR } = await import('./resto-dinein-actions')
            const result = await validateTableQR(ORG_ID, 'qr-token-table-01')

            expect(result.success).toBe(false)
            expect(result.error).toContain('La mesa se está limpiando')
        })
    })

    describe('Check Request (requestBill)', () => {
        it('transitions session to payment_pending and table status to billing with tip recorded', async () => {
            const sessionLookup = createQueryChain({
                data: {
                    id: SESSION_ID,
                    table_id: TABLE_ID,
                    status: 'active',
                },
                error: null,
            })

            const sessionStatusUpdate = createQueryChain({ data: null, error: null })
            const tableStatusUpdate = createQueryChain({ data: null, error: null })
            const firstOrderLookup = createQueryChain({
                data: { id: 'order-round-1', tip_amount: 0 },
                error: null,
            })
            const orderTipUpdate = createQueryChain({ data: null, error: null })

            useTableQueues({
                resto_table_sessions: [sessionLookup, sessionStatusUpdate],
                resto_tables: [tableStatusUpdate],
                resto_orders: [firstOrderLookup, orderTipUpdate],
            })

            const { requestBill } = await import('./resto-session-actions')
            const result = await requestBill(SESSION_ID, 5000, 'cash')

            expect(result.success).toBe(true)
            expect(sessionStatusUpdate.update).toHaveBeenCalledWith({
                status: 'payment_pending',
                payment_method: 'cash',
            })
            expect(tableStatusUpdate.update).toHaveBeenCalledWith({
                status: 'billing',
            })
            expect(tableStatusUpdate.eq).toHaveBeenCalledWith('id', TABLE_ID)
            expect(orderTipUpdate.update).toHaveBeenCalledWith({
                tip_amount: 5000,
            })
            expect(mocks.revalidatePath).toHaveBeenCalled()
        })

        it('rejects bill request if session is already closed or in billing', async () => {
            const sessionLookup = createQueryChain({
                data: {
                    id: SESSION_ID,
                    table_id: TABLE_ID,
                    status: 'closed',
                },
                error: null,
            })

            useTableQueues({
                resto_table_sessions: [sessionLookup],
            })

            const { requestBill } = await import('./resto-session-actions')
            const result = await requestBill(SESSION_ID, 2000, 'nequi')

            expect(result.success).toBe(false)
            expect(result.error).toBe('La sesión ya fue cerrada o está en facturación')
        })
    })

    describe('Payment & Session Release (processOrderPayment)', () => {
        it('processes payment for session: closes session, releases table, and completes all session orders', async () => {
            mocks.getCurrentOrganizationId.mockResolvedValue(ORG_ID)

            const sessionLookup = createQueryChain({
                data: {
                    id: SESSION_ID,
                    table_id: TABLE_ID,
                },
                error: null,
            })

            const sessionCloseUpdate = createQueryChain({ data: null, error: null })
            const tableReleaseUpdate = createQueryChain({ data: null, error: null })
            const ordersCompleteUpdate = createQueryChain({ data: null, error: null })

            useTableQueues({
                resto_table_sessions: [sessionLookup, sessionCloseUpdate],
                resto_tables: [tableReleaseUpdate],
                resto_orders: [ordersCompleteUpdate],
            })

            const { processOrderPayment } = await import('@/modules/features/resto-orders/actions')
            const result = await processOrderPayment({
                targetId: SESSION_ID,
                targetType: 'session',
                paymentMethod: 'card',
                referenceNumber: 'TX-987654',
            })

            expect(result.success).toBe(true)
            expect(sessionCloseUpdate.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'closed',
                    payment_status: 'paid',
                    payment_method: 'card',
                })
            )
            expect(tableReleaseUpdate.update).toHaveBeenCalledWith({
                status: 'available',
                current_session_id: null,
            })
            expect(tableReleaseUpdate.eq).toHaveBeenCalledWith('id', TABLE_ID)
            expect(ordersCompleteUpdate.update).toHaveBeenCalledWith({
                payment_status: 'paid',
                payment_method: 'card',
                kitchen_status: 'completed',
            })
            expect(ordersCompleteUpdate.eq).toHaveBeenCalledWith('session_id', SESSION_ID)
        })
    })
})
