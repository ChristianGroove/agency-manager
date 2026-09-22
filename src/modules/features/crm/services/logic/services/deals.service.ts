
import { SupabaseClient } from '@supabase/supabase-js'
import { DealsRepository, CartItem, DealCart } from '../repositories/deals.repository'

export class DealsService {
    private repo: DealsRepository

    // Note: Can be initialized with admin client or user client depending on the action's auth level needed
    constructor(private supabase: SupabaseClient) {
        this.repo = new DealsRepository(supabase)
    }

    async getOrCreateDealCart(leadId: string): Promise<DealCart> {
        let cart = await this.repo.getCartByLead(leadId)
        
        if (cart) return cart

        // Fetch lead's org to assign to cart
        const { data: lead } = await this.supabase
            .from('leads')
            .select('organization_id')
            .eq('id', leadId)
            .single()
            
        if (!lead) throw new Error('Lead not found')

        return this.repo.createCart({
            lead_id: leadId,
            organization_id: lead.organization_id,
            status: 'draft',
            total_amount: 0
        })
    }

    async addToCart(cartId: string, product: any, quantity: number = 1): Promise<void> {
        const currentItem = await this.repo.getCartItemByProduct(cartId, product.id)

        if (currentItem) {
            await this.repo.updateCartItem(currentItem.id, {
                quantity: currentItem.quantity + quantity,
                updated_at: new Date().toISOString()
            })
        } else {
            await this.repo.insertCartItem({
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
        await this.repo.removeCartItem(itemId)
    }

    async updateCartItem(itemId: string, quantity: number): Promise<void> {
        if (quantity <= 0) {
            await this.removeCartItem(itemId)
        } else {
            await this.repo.updateCartItem(itemId, { quantity })
        }
    }

    async searchCatalog(orgId: string, query: string, category: string | undefined, page: number, pageSize: number) {
        const { data, count } = await this.repo.searchCatalog(orgId, query, category, page, pageSize)
        return {
            data,
            count,
            hasMore: data.length === pageSize
        }
    }

    async sendInteractiveQuote(cartId: string, conversationId: string): Promise<void> {
        // 1. Get Cart payload
        const cart = await this.repo.getCartById(cartId)
        if (!cart || !cart.items.length) {
            throw new Error("Cart empty or not found")
        }

        // 2. Fetch Conversation details 
        const conversation = await this.repo.getConversationDetails(conversationId)
        if (!conversation) throw new Error("Conversation not found")
        if (!cart.organization_id || conversation.organization_id !== cart.organization_id || !conversation.connection_id) {
            throw new Error('La cotización no tiene un canal vinculado a esta organización')
        }

        const convAny = conversation as any
        const recipientPhone = convAny.phone || convAny.metadata?.phone || convAny.metadata?.external_id || ''
        if (!recipientPhone) throw new Error("No phone number found for recipient")

        // 3. Load UI Settings for template rendering
        const { getQuoteSettings } = await import('../quote-settings')
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
