
import { SupabaseClient } from '@supabase/supabase-js'
import { DealCart, CartItem } from '../types'

export class DealService {
    constructor(private supabase: SupabaseClient) {}

    // --- CART LOGIC ---

    async getOrCreateDealCart(leadId: string): Promise<DealCart> {
        const { data: cart, error } = await this.supabase
            .from('deal_carts')
            .select('*, items:cart_items(*)')
            .eq('lead_id', leadId)
            .maybeSingle()
        
        if (error) throw error
        if (cart) return cart as DealCart

        // Fetch lead's org to assign to cart
        const { data: lead } = await this.supabase
            .from('leads')
            .select('organization_id')
            .eq('id', leadId)
            .single()
            
        if (!lead) throw new Error('Lead not found')

        const { data: newCart, error: createError } = await this.supabase
            .from('deal_carts')
            .insert({
                lead_id: leadId,
                organization_id: lead.organization_id,
                status: 'draft',
                total_amount: 0
            })
            .select()
            .single()

        if (createError) throw createError
        return { ...newCart, items: [] } as DealCart
    }

    async addToCart(cartId: string, product: any, quantity: number = 1): Promise<void> {
        const { data: currentItem } = await this.supabase
            .from('cart_items')
            .select('*')
            .eq('cart_id', cartId)
            .eq('product_id', product.id)
            .maybeSingle()

        if (currentItem) {
            await this.supabase
                .from('cart_items')
                .update({
                    quantity: currentItem.quantity + quantity,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentItem.id)
        } else {
            await this.supabase
                .from('cart_items')
                .insert({
                    cart_id: cartId,
                    product_id: product.id,
                    name: product.name,
                    unit_price: product.base_price || 0,
                    quantity: quantity,
                    metadata: {
                        ...(product.metadata || {}),
                        image_url: product.image_url,
                        category: product.category
                    }
                })
        }
    }

    async removeCartItem(itemId: string): Promise<void> {
        await this.supabase
            .from('cart_items')
            .delete()
            .eq('id', itemId)
    }

    async updateCartItem(itemId: string, quantity: number): Promise<void> {
        if (quantity <= 0) {
            await this.removeCartItem(itemId)
        } else {
            await this.supabase
                .from('cart_items')
                .update({ quantity })
                .eq('id', itemId)
        }
    }

    // --- CATALOG SEARCH ---

    async searchCatalog(orgId: string, query: string, category: string | undefined, page: number, pageSize: number) {
        let dbQuery = this.supabase
            .from('service_catalog')
            .select('*', { count: 'exact' })
            .order('name', { ascending: true })
            .eq('organization_id', orgId)

        const from = page * pageSize
        const to = from + pageSize - 1
        dbQuery = dbQuery.range(from, to)

        if (query) dbQuery = dbQuery.ilike('name', `%${query}%`)
        if (category && category !== 'all') dbQuery = dbQuery.eq('category', category)

        const { data, error, count } = await dbQuery
        if (error) throw error

        return {
            data: data || [],
            count: count || 0,
            hasMore: (data || []).length === pageSize
        }
    }

    // --- INTERACTIVE QUOTES (WhatsApp) ---

    async sendInteractiveQuote(cartId: string, conversationId: string): Promise<void> {
        // 1. Get Cart payload
        const { data: cart, error: cartError } = await this.supabase
            .from('deal_carts')
            .select('*, items:cart_items(*)')
            .eq('id', cartId)
            .single()

        if (cartError || !cart || !cart.items.length) {
            throw new Error("Cart empty or not found")
        }

        // 2. Fetch Conversation details 
        const { data: conversation } = await this.supabase
            .from('conversations')
            .select('id, phone, metadata, connection_id, organization_id, leads(phone)')
            .eq('id', conversationId)
            .single()

        if (!conversation) throw new Error("Conversation not found")
        if (conversation.organization_id !== cart.organization_id || !conversation.connection_id) {
            throw new Error('La cotización no tiene un canal vinculado a esta organización')
        }

        const convAny = conversation as any
        const recipientPhone = convAny.phone || convAny.metadata?.phone || convAny.metadata?.external_id || ''
        if (!recipientPhone) throw new Error("No phone number found for recipient")

        // 3. Load UI Settings
        const { getQuoteSettings } = await import('./logic/quote-settings')
        const settingsRes = await getQuoteSettings()
        const settings = settingsRes.settings

        const headerText = settings?.template_config?.header || "COTIZACIÓN FORMAL"
        const footerText = settings?.template_config?.footer || "Agency Manager Secured"
        const approveLabel = settings?.approve_label || "✅ Aprobar"
        const rejectLabel = settings?.reject_label || "❌ Rechazar"

        const date = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

        let bodyText = `📅 *Fecha:* ${date}\n\n*DETALLE DE SERVICIOS*\n----------------------------------\n`
        cart.items.forEach((item: any) => {
            const total = (item.unit_price * item.quantity).toLocaleString()
            bodyText += `🔹 *${item.name}*\n   ${item.quantity} x $${item.unit_price.toLocaleString()} = *$${total}*`
            if (item.metadata?.description) bodyText += `\n   _${item.metadata.description}_`
            bodyText += `\n`
        })
        bodyText += `----------------------------------\n*TOTAL: $${cart.total_amount?.toLocaleString()}*`

        const { outboundService } = await import('@/modules/features/messaging/outbound-service')
        await outboundService.sendMessage(conversation.connection_id, recipientPhone, {
            type: 'interactive_buttons', body: bodyText,
            header: { type: 'text', text: headerText }, footer: footerText,
            buttons: [
                { id: `approve_cart_${cartId}`, title: approveLabel },
                { id: `reject_cart_${cartId}`, title: rejectLabel },
            ],
        }, cart.organization_id, { conversation, sender: 'Agent', requiredChannel: 'whatsapp' })
    }
}
