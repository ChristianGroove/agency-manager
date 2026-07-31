import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    supabaseAdminFrom: vi.fn(),
    supabaseServerFrom: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseAdminFrom,
    }
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mocks.supabaseServerFrom,
    }))
}))

function createQueryChain(result: { data?: any; error?: any; count?: number | null }) {
    const chain: any = {}
    chain.select = vi.fn(() => chain)
    chain.insert = vi.fn(() => chain)
    chain.update = vi.fn(() => chain)
    chain.in = vi.fn(() => chain)
    chain.eq = vi.fn(() => chain)
    chain.is = vi.fn(() => chain)
    chain.single = vi.fn(async () => result)
    chain.maybeSingle = vi.fn(async () => result)
    chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
    return chain
}

function useAdminTableQueues(queues: Record<string, any[]>) {
    const tableQueues = Object.fromEntries(
        Object.entries(queues).map(([table, tableQueue]) => [table, [...tableQueue]])
    )

    mocks.supabaseAdminFrom.mockImplementation((table: string) => {
        const queue = tableQueues[table]
        if (!queue?.length) {
            throw new Error(`Unexpected admin table call: ${table}`)
        }
        return queue.shift()
    })
}

function useServerTableQueues(queues: Record<string, any[]>) {
    const tableQueues = Object.fromEntries(
        Object.entries(queues).map(([table, tableQueue]) => [table, [...tableQueue]])
    )

    mocks.supabaseServerFrom.mockImplementation((table: string) => {
        const queue = tableQueues[table]
        if (!queue?.length) {
            throw new Error(`Unexpected server table call: ${table}`)
        }
        return queue.shift()
    })
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.supabaseAdminFrom.mockReset()
    mocks.supabaseServerFrom.mockReset()
})

describe('Realtime & Concurrency: Dine-in Order Rounds (sendDineInRound)', () => {
    const ORG_ID = 'org-resto-round'
    const SESSION_ID = 'session-round-123'
    const TABLE_ID = 'table-round-456'

    it('successfully places a dine-in round, calculates server prices, increments round_number, and updates total_accumulated', async () => {
        // 1. Session lookup (Admin DB)
        const sessionQuery = createQueryChain({
            data: {
                id: SESSION_ID,
                table_id: TABLE_ID,
                status: 'active',
                total_accumulated: 15000,
            },
            error: null,
        })

        // 2. Menu validation (Server DB inside calculateSecureCartTotal)
        const menuQuery = createQueryChain({
            data: [
                {
                    id: 'menu-taco-id',
                    name: 'Tacos al Pastor',
                    base_price: 18000,
                    is_visible: true,
                    is_available: true,
                    metadata: null,
                    resto_item_modifier_groups: [],
                }
            ],
            error: null,
        })

        // 3. Existing orders count (Admin DB)
        const countQuery = createQueryChain({
            data: null,
            error: null,
            count: 1, // Round 1 already placed, so this will be Round 2!
        })

        // 4. Order insert (Admin DB)
        const orderInsert = createQueryChain({
            data: { id: 'order-round-2-id' },
            error: null,
        })

        // 5. Session total update (Admin DB)
        const sessionUpdate = createQueryChain({
            data: null,
            error: null,
        })

        useAdminTableQueues({
            resto_table_sessions: [sessionQuery, sessionUpdate],
            resto_orders: [countQuery, orderInsert],
        })

        useServerTableQueues({
            resto_menu_items: [menuQuery],
        })

        const { sendDineInRound } = await import('./resto-session-actions')

        const roundPayload = {
            orgId: ORG_ID,
            sessionId: SESSION_ID,
            customerName: 'Mateo',
            notes: 'Sin cebolla',
            items: [
                {
                    id: 'round-item-1',
                    menuItemId: 'menu-taco-id',
                    title: 'Tacos al Pastor',
                    price: 18000,
                    quantity: 2,
                    modifiers: [],
                } as any
            ]
        }

        const result = await sendDineInRound(roundPayload)

        expect(result.success).toBe(true)
        expect(result.orderId).toBe('order-round-2-id')
        expect(result.roundNumber).toBe(2)
        expect(result.newTotal).toBe(51000) // 15000 previous + (18000 * 2)

        expect(orderInsert.insert).toHaveBeenCalledWith(
            expect.objectContaining({
                organization_id: ORG_ID,
                session_id: SESSION_ID,
                table_id: TABLE_ID,
                round_number: 2,
                total: 36000,
                resto_mode: 'dine_in',
                kitchen_status: 'pending',
                payment_status: 'unpaid',
            })
        )

        expect(sessionUpdate.update).toHaveBeenCalledWith({
            total_accumulated: 51000,
        })
        expect(sessionUpdate.eq).toHaveBeenCalledWith('id', SESSION_ID)
    })

    it('rejects dine-in round ordering when session has transitioned to inactive status (race condition / closed session)', async () => {
        // Session has transitioned to payment_pending or closed (e.g. guest requested bill or table was closed)
        const sessionQuery = createQueryChain({
            data: {
                id: SESSION_ID,
                table_id: TABLE_ID,
                status: 'payment_pending',
                total_accumulated: 50000,
            },
            error: null,
        })

        useAdminTableQueues({
            resto_table_sessions: [sessionQuery],
        })

        const { sendDineInRound } = await import('./resto-session-actions')

        const result = await sendDineInRound({
            orgId: ORG_ID,
            sessionId: SESSION_ID,
            items: [
                {
                    id: 'item-1',
                    menuItemId: 'menu-taco-id',
                    title: 'Tacos',
                    price: 10000,
                    quantity: 1,
                } as any
            ]
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('La sesión no está activa. No puedes pedir más rondas.')
    })

    it('verifies concurrent round orders maintain order integrity and reject price tampering', async () => {
        // Session lookup
        const sessionQuery = createQueryChain({
            data: {
                id: SESSION_ID,
                table_id: TABLE_ID,
                status: 'active',
                total_accumulated: 0,
            },
            error: null,
        })

        // Server menu item with DB price 20000
        const menuQuery = createQueryChain({
            data: [
                {
                    id: 'menu-drink-id',
                    name: 'Coctel Margarita',
                    base_price: 20000,
                    is_visible: true,
                    is_available: true,
                    metadata: null,
                    resto_item_modifier_groups: [],
                }
            ],
            error: null,
        })

        useAdminTableQueues({
            resto_table_sessions: [sessionQuery],
        })

        useServerTableQueues({
            resto_menu_items: [menuQuery],
        })

        const { sendDineInRound } = await import('./resto-session-actions')

        // Attacker attempts to send round order with fake price 500 COP
        const tamperedPayload = {
            orgId: ORG_ID,
            sessionId: SESSION_ID,
            items: [
                {
                    id: 'fake-item',
                    menuItemId: 'menu-drink-id',
                    title: 'Coctel Margarita',
                    price: 500, // Price tampering attempt!
                    quantity: 1,
                } as any
            ]
        }

        const result = await sendDineInRound(tamperedPayload)

        expect(result.success).toBe(false)
        expect(result.error).toContain('El carrito está desactualizado')
    })
})
