import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItemModifier {
    groupName: string
    optionName: string
    price: number
}

export interface CartItem {
    id: string
    menuItemId: string
    title: string
    price: number
    quantity: number
    image?: string
    notes?: string
    modifiers?: CartItemModifier[]
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
    
    // Dine-in Fields
    orderMode: 'delivery' | 'pickup' | 'dine-in'
    tableId: string | null
    tableIdentifier: string | null
    sessionId: string | null

    setOrgId: (id: string) => void
    setCustomerProfile: (profile: Partial<CustomerProfile>) => void
    addRecentOrder: (orderId: string) => void
    
    setOrderMode: (mode: 'delivery' | 'pickup' | 'dine-in') => void
    setTableContext: (tableId: string, tableIdentifier: string, sessionId: string) => void
    clearTableContext: () => void

    addItem: (item: Omit<CartItem, 'id'>) => void
    removeItem: (id: string) => void
    updateQuantity: (id: string, quantity: number) => void
    clearCart: () => void
    setItems: (items: CartItem[]) => void
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
            
            orderMode: 'delivery',
            tableId: null,
            tableIdentifier: null,
            sessionId: null,

            setOrgId: (id) => set({ orgId: id }),

            setCustomerProfile: (profile) => set(state => ({
                customerProfile: { ...state.customerProfile, ...profile }
            })),

            addRecentOrder: (orderId) => set(state => ({
                recentOrders: [orderId, ...state.recentOrders].slice(0, 10) // Keep last 10
            })),

            setOrderMode: (mode) => set({ orderMode: mode }),
            
            setTableContext: (tableId, tableIdentifier, sessionId) => set({
                orderMode: 'dine-in',
                tableId,
                tableIdentifier,
                sessionId
            }),

            clearTableContext: () => set({
                orderMode: 'delivery',
                tableId: null,
                tableIdentifier: null,
                sessionId: null
            }),

            addItem: (item) => {
                const currentItems = get().items
                // Check if identical item already exists to sum quantities
                const existing = currentItems.find(i => 
                    i.menuItemId === item.menuItemId && 
                    i.notes === item.notes &&
                    JSON.stringify(i.modifiers || []) === JSON.stringify(item.modifiers || [])
                )

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

            setItems: (items) => set({ items }),

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
