import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
    id: string
    catalogItemId: string
    title: string
    price: number
    quantity: number
    image?: string
    notes?: string
}

interface CustomerProfile {
    name: string
    phone: string
    address: string
}

interface RestoCartState {
    items: CartItem[]
    orgId: string | null
    customerProfile: CustomerProfile
    recentOrders: string[]
    setOrgId: (id: string) => void
    setCustomerProfile: (profile: Partial<CustomerProfile>) => void
    addRecentOrder: (orderId: string) => void
    addItem: (item: Omit<CartItem, 'id'>) => void
    removeItem: (id: string) => void
    updateQuantity: (id: string, quantity: number) => void
    clearCart: () => void
    getTotal: () => number
    getItemCount: () => number
}

export const useRestoCart = create<RestoCartState>()(
    persist(
        (set, get) => ({
            items: [],
            orgId: null,
            customerProfile: { name: '', phone: '', address: '' },
            recentOrders: [],

            setOrgId: (id) => set({ orgId: id }),

            setCustomerProfile: (profile) => set(state => ({
                customerProfile: { ...state.customerProfile, ...profile }
            })),

            addRecentOrder: (orderId) => set(state => ({
                recentOrders: [orderId, ...state.recentOrders].slice(0, 10) // Keep last 10
            })),

            addItem: (item) => {
                const currentItems = get().items
                // Check if identical item already exists to sum quantities
                const existing = currentItems.find(i => i.catalogItemId === item.catalogItemId && i.notes === item.notes)

                if (existing) {
                    set({
                        items: currentItems.map(i =>
                            i.id === existing.id
                                ? { ...i, quantity: i.quantity + item.quantity }
                                : i
                        )
                    })
                } else {
                    set({
                        items: [...currentItems, { ...item, id: crypto.randomUUID() }]
                    })
                }
            },

            removeItem: (id) => set({
                items: get().items.filter(i => i.id !== id)
            }),

            updateQuantity: (id, quantity) => set({
                items: get().items.map(i =>
                    i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i
                )
            }),

            clearCart: () => set({ items: [] }),

            getTotal: () => {
                return get().items.reduce((total, item) => total + (item.price * item.quantity), 0)
            },

            getItemCount: () => {
                return get().items.reduce((count, item) => count + item.quantity, 0)
            }
        }),
        {
            name: 'resto-cart-storage'
        }
    )
)
