import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mocks.from,
    }))
}))

function createQueryChain(result: { data?: any; error?: any }) {
    const chain: any = {}
    chain.select = vi.fn(() => chain)
    chain.in = vi.fn(() => chain)
    chain.eq = vi.fn(() => chain)
    chain.is = vi.fn(() => chain)
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
})

describe('Checkout & Cart Security Validation', () => {
    const ORG_ID = 'org-resto-security'

    describe('Server-Side Cart Validation (validateCartItems)', () => {
        it('validates a correct cart against DB prices and modifier groups', async () => {
            const menuQuery = createQueryChain({
                data: [
                    {
                        id: 'item-burger-id',
                        name: 'Hamburguesa Especial',
                        base_price: 25000,
                        is_visible: true,
                        is_available: true,
                        metadata: null,
                        resto_item_modifier_groups: [
                            {
                                order_index: 0,
                                resto_modifier_groups: {
                                    name: 'Queso',
                                    options: [{ name: 'Doble Queso', price: 3000 }],
                                }
                            }
                        ]
                    }
                ],
                error: null,
            })

            useTableQueues({
                resto_menu_items: [menuQuery],
            })

            const { validateCartItems } = await import('./checkout-actions')
            const localItems = [
                {
                    id: 'cart-1',
                    menuItemId: 'item-burger-id',
                    title: 'Hamburguesa Especial',
                    price: 28000, // 25000 + 3000
                    quantity: 2,
                    modifiers: [{ groupName: 'Queso', optionName: 'Doble Queso' }]
                } as any
            ]

            const result = await validateCartItems(localItems, ORG_ID)

            expect(result.valid).toBe(true)
            expect(result.messages).toHaveLength(0)
            expect(result.items[0].price).toBe(28000)
            expect(result.items[0].title).toBe('Hamburguesa Especial')
        })

        it('detects and flags price tampering when client submits tampered item prices', async () => {
            const menuQuery = createQueryChain({
                data: [
                    {
                        id: 'item-steak-id',
                        name: 'Lomo al Trapo',
                        base_price: 45000,
                        is_visible: true,
                        is_available: true,
                        metadata: null,
                        resto_item_modifier_groups: []
                    }
                ],
                error: null,
            })

            useTableQueues({
                resto_menu_items: [menuQuery],
            })

            const { validateCartItems } = await import('./checkout-actions')
            // Client maliciously sets price to 100 COP instead of 45000 COP
            const tamperedItems = [
                {
                    id: 'cart-tampered-1',
                    menuItemId: 'item-steak-id',
                    title: 'Lomo al Trapo',
                    price: 100, // Price tampering attempt!
                    quantity: 1,
                    modifiers: []
                } as any
            ]

            const result = await validateCartItems(tamperedItems, ORG_ID)

            expect(result.valid).toBe(false)
            expect(result.messages).toContain('El precio de "Lomo al Trapo" ha sido actualizado.')
            expect(result.items[0].price).toBe(45000) // Corrected to server DB price
        })

        it('detects unavailable or hidden menu items', async () => {
            const menuQuery = createQueryChain({
                data: [
                    {
                        id: 'item-soldout-id',
                        name: 'Cerveza Artesanal',
                        base_price: 12000,
                        is_visible: true,
                        is_available: false, // Sold out!
                        metadata: null,
                        resto_item_modifier_groups: []
                    }
                ],
                error: null,
            })

            useTableQueues({
                resto_menu_items: [menuQuery],
            })

            const { validateCartItems } = await import('./checkout-actions')
            const localItems = [
                {
                    id: 'cart-soldout-1',
                    menuItemId: 'item-soldout-id',
                    title: 'Cerveza Artesanal',
                    price: 12000,
                    quantity: 1,
                    modifiers: []
                } as any
            ]

            const result = await validateCartItems(localItems, ORG_ID)

            expect(result.valid).toBe(false)
            expect(result.messages).toContain('"Cerveza Artesanal" se ha agotado temporalmente.')
        })
    })

    describe('Secure Cart Total Calculation (calculateSecureCartTotal)', () => {
        it('calculates the exact secure cart total for valid items', async () => {
            const menuQuery = createQueryChain({
                data: [
                    {
                        id: 'item-pizza-id',
                        name: 'Pizza Pepperoni',
                        base_price: 30000,
                        is_visible: true,
                        is_available: true,
                        metadata: null,
                        resto_item_modifier_groups: []
                    }
                ],
                error: null,
            })

            useTableQueues({
                resto_menu_items: [menuQuery],
            })

            const { calculateSecureCartTotal } = await import('./checkout-actions')
            const localItems = [
                {
                    id: 'cart-pizza-1',
                    menuItemId: 'item-pizza-id',
                    title: 'Pizza Pepperoni',
                    price: 30000,
                    quantity: 3,
                    modifiers: []
                } as any
            ]

            const total = await calculateSecureCartTotal(localItems, ORG_ID)

            expect(total).toBe(90000) // 30000 * 3
        })

        it('throws an error and rejects calculation if cart has tampered prices', async () => {
            const menuQuery = createQueryChain({
                data: [
                    {
                        id: 'item-wine-id',
                        name: 'Vino Tinto Reserva',
                        base_price: 85000,
                        is_visible: true,
                        is_available: true,
                        metadata: null,
                        resto_item_modifier_groups: []
                    }
                ],
                error: null,
            })

            useTableQueues({
                resto_menu_items: [menuQuery],
            })

            const { calculateSecureCartTotal } = await import('./checkout-actions')
            const tamperedCart = [
                {
                    id: 'cart-wine-1',
                    menuItemId: 'item-wine-id',
                    title: 'Vino Tinto Reserva',
                    price: 5000, // Tampered price
                    quantity: 1,
                    modifiers: []
                } as any
            ]

            await expect(calculateSecureCartTotal(tamperedCart, ORG_ID)).rejects.toThrow(
                'El carrito está desactualizado. Por favor, revísalo antes de continuar.'
            )
        })
    })
})
