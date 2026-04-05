import { SupabaseClient } from '@supabase/supabase-js'

export interface CartItem {
    id: string
    cart_id: string
    product_id: string | null
    name: string
    unit_price: number
    quantity: number
    metadata: any
    updated_at?: string
}

export interface DealCart {
    id: string
    lead_id: string
    total_amount: number
    status: 'draft' | 'locked' | 'converted'
    organization_id?: string
    items: CartItem[]
}

export class DealsRepository {
    constructor(private supabase: SupabaseClient) {}

    // --- CARTS ---
    async getCartByLead(leadId: string): Promise<DealCart | null> {
        const { data, error } = await this.supabase
            .from('deal_carts')
            .select('*, items:cart_items(*)')
            .eq('lead_id', leadId)
            .maybeSingle()
            
        if (error) throw error
        return data as DealCart
    }

    async getCartById(cartId: string): Promise<DealCart> {
        const { data, error } = await this.supabase
            .from('deal_carts')
            .select('*, items:cart_items(*)')
            .eq('id', cartId)
            .single()

        if (error || !data) throw new Error("Cart not found")
        return data as DealCart
    }

    async createCart(payload: { lead_id: string, organization_id: string, status: string, total_amount: number }): Promise<DealCart> {
        const { data, error } = await this.supabase
            .from('deal_carts')
            .insert(payload)
            .select()
            .single()

        if (error) throw error
        return { ...data, items: [] } as DealCart
    }

    // --- CART ITEMS ---
    async getCartItemByProduct(cartId: string, productId: string): Promise<CartItem | null> {
        const { data } = await this.supabase
            .from('cart_items')
            .select('*')
            .eq('cart_id', cartId)
            .eq('product_id', productId)
            .maybeSingle()
            
        return data as CartItem | null
    }

    async updateCartItem(itemId: string, updates: Partial<CartItem>): Promise<void> {
        const { error } = await this.supabase
            .from('cart_items')
            .update(updates)
            .eq('id', itemId)

        if (error) throw error
    }

    async insertCartItem(payload: Partial<CartItem>): Promise<void> {
        const { error } = await this.supabase
            .from('cart_items')
            .insert(payload)

        if (error) throw error
    }

    async removeCartItem(itemId: string): Promise<void> {
        const { error } = await this.supabase
            .from('cart_items')
            .delete()
            .eq('id', itemId)

        if (error) throw error
    }

    // --- CATALOG SEARCH ---
    async searchCatalog(orgId: string, query: string, category: string | undefined, page: number, pageSize: number): Promise<{ data: any[], count: number }> {
        let dbQuery = this.supabase
            .from('service_catalog')
            .select('*', { count: 'exact' })
            .order('name', { ascending: true })
            .eq('organization_id', orgId)

        const from = page * pageSize
        const to = from + pageSize - 1
        dbQuery = dbQuery.range(from, to)

        if (query) {
            dbQuery = dbQuery.ilike('name', `%${query}%`)
        }

        if (category && category !== 'all') {
            dbQuery = dbQuery.eq('category', category)
        }

        const { data, error, count } = await dbQuery
        if (error) throw error

        return { data: data || [], count: count || 0 }
    }

    // --- META/WHATSAPP ROUTING QUERY HELPERS (Required for Service Payload) ---
    async getConversationDetails(conversationId: string) {
        const { data, error } = await this.supabase
            .from('conversations')
            .select('id, phone, metadata, connection_id, leads(phone)')
            .eq('id', conversationId)
            .single()

        if (error) throw error
        return data
    }

    async getConnectionById(connectionId: string) {
        const { data } = await this.supabase
            .from('integration_connections')
            .select('*')
            .eq('id', connectionId)
            .single()
        return data
    }

    async getDefaultWhatsAppConnection(orgId: string) {
        const { data } = await this.supabase
            .from('integration_connections')
            .select('*')
            .eq('organization_id', orgId)
            .in('provider_key', ['meta_whatsapp', 'whatsapp_cloud', 'evolution_api'])
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
        return data
    }
}
