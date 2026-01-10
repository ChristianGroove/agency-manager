"use server"

import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from 'next/cache'

export interface CartItem {
    id: string
    cart_id: string
    product_id: string | null
    name: string
    unit_price: number
    quantity: number
    metadata: any
}

export interface DealCart {
    id: string
    lead_id: string
    total_amount: number
    status: 'draft' | 'locked' | 'converted'
    items: CartItem[]
}

// 1. Get or Create Cart for Lead
export async function getDealCart(leadId: string): Promise<{ success: boolean, cart?: DealCart, error?: string }> {
    const supabase = await createClient()

    try {
        // Try getting existing cart
        const { data: existingCart, error: fetchError } = await supabase
            .from('deal_carts')
            .select(`
                *,
                items:cart_items(*)
            `)
            .eq('lead_id', leadId)
            // .eq('status', 'draft') // Ideally we only edit drafts. 
            .single()

        if (existingCart) {
            return { success: true, cart: existingCart }
        }

        // If not exists, create one
        // Needed: Organization ID. Since RLS enforces based on user, we can try to fetch lead's org or user's org.
        // Safer to fetch lead first to get organization_id
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('organization_id')
            .eq('id', leadId)
            .single()

        if (leadError || !lead) throw new Error('Lead not found')

        const { data: newCart, error: createError } = await supabase
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

        return { success: true, cart: { ...newCart, items: [] } }

    } catch (error: any) {
        console.error('getDealCart Error:', error)
        return { success: false, error: error.message }
    }
}

// 2. Add Item to Cart
export async function addToCart(cartId: string, product: any, quantity: number = 1) {
    const supabase = await createClient()

    try {
        // Optimistic check: Does item exist with same product_id?
        // Note: We might want separate lines for same product if metadata differs, but for V1 let's assume simple addition.
        const { data: currentItems } = await supabase
            .from('cart_items')
            .select('*')
            .eq('cart_id', cartId)
            .eq('product_id', product.id)
            .maybeSingle()

        if (currentItems) {
            // Update Quantity
            const { error } = await supabase
                .from('cart_items')
                .update({
                    quantity: currentItems.quantity + quantity,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentItems.id)

            if (error) throw error
        } else {
            // Insert New
            const { error } = await supabase
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

            if (error) throw error
        }

        revalidatePath('/platform/crm')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// 3. Remove Item
export async function removeCartItem(itemId: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('cart_items').delete().eq('id', itemId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/platform/crm')
    return { success: true }
}

// 4. Update Item (Quantity)
export async function updateCartItem(itemId: string, quantity: number) {
    const supabase = await createClient()

    if (quantity <= 0) return removeCartItem(itemId)

    const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/platform/crm')
    return { success: true }
}

// 5. Search Catalog
export async function searchCatalog(query: string = '', category?: string) {
    const supabase = await createClient()

    let dbQuery = supabase
        .from('service_catalog')
        .select('*')
        .order('name', { ascending: true })
        .limit(20)

    if (query) {
        dbQuery = dbQuery.ilike('name', `%${query}%`)
    }

    if (category && category !== 'all') {
        dbQuery = dbQuery.eq('category', category)
    }

    const { data, error } = await dbQuery

    if (error) return { success: false, error: error.message }
    return { success: true, data }
}

// 6. Send Interactive Quote (The Innovation)
import { getQuoteSettings } from './quote-settings'
import { MetaProvider } from '../messaging/providers/meta-provider'
import { logDebug } from '@/lib/debug-logger'

export async function sendInteractiveQuote(cartId: string, conversationId: string) {
    const supabase = await createClient()

    try {
        await logDebug("Starting sendInteractiveQuote", { cartId, conversationId })
        // Check env var existence (but for security, don't log full key)
        await logDebug("Env Check", {
            hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            keyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length
        })

        // 1. Get Cart (using admin client to bypass auth)
        const { data: cart } = await supabaseAdmin
            .from('deal_carts')
            .select('*, items:cart_items(*)')
            .eq('id', cartId)
            .single()

        if (!cart || !cart.items.length) {
            await logDebug("Cart empty or not found", cart)
            throw new Error("Cart empty or not found")
        }

        // 2. Get Conversation info (using admin client)
        const { data: conversation } = await supabaseAdmin
            .from('conversations')
            .select('id, phone, metadata, connection_id')
            .eq('id', conversationId)
            .single()

        if (!conversation) {
            await logDebug("Conversation not found", conversationId)
            throw new Error("Conversation not found")
        }

        await logDebug("Conversation found", conversation)

        let recipientPhone = conversation.phone || conversation.metadata?.phone_number || conversation.metadata?.displayPhoneNumber || ''
        if (!recipientPhone) {
            await logDebug("No recipient phone", conversation)
            throw new Error("No phone number found for recipient")
        }

        // 3. Get Settings
        const settingsRes = await getQuoteSettings()
        const settings = settingsRes.settings

        // 4. Construct Body
        const headerText = settings?.template_config.header || "COTIZACIÓN FORMAL"
        const footerText = settings?.template_config.footer || "Agency Manager Secured"
        const approveLabel = settings?.approve_label || "✅ Aprobar"
        const rejectLabel = settings?.reject_label || "❌ Rechazar"

        const date = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

        let bodyText = `📅 *Fecha:* ${date}\n\n`
        bodyText += `*DETALLE DE SERVICIOS*\n`
        bodyText += `----------------------------------\n`

        cart.items.forEach((item: any) => {
            const total = (item.unit_price * item.quantity).toLocaleString()
            bodyText += `🔹 *${item.name}*\n   ${item.quantity} x $${item.unit_price.toLocaleString()} = *$${total}*`
            if (item.metadata?.description) bodyText += `\n   _${item.metadata.description}_`
            bodyText += `\n`
        })

        bodyText += `----------------------------------\n`
        bodyText += `*TOTAL: $${cart.total_amount?.toLocaleString()}*`

        // 5. Connection Lookup
        let provider = new MetaProvider('', '', '')
        let connectionFound = false

        if (conversation.connection_id) {
            await logDebug(`Using connection_id: ${conversation.connection_id}`)
            const { data: conn, error: connError } = await supabaseAdmin.from('integration_connections').select('*').eq('id', conversation.connection_id).single()

            if (connError) await logDebug("Connection lookup error", connError)

            if (conn?.credentials) {
                const { decryptObject } = await import('../integrations/encryption')
                let creds = conn.credentials
                if (typeof creds === 'string') {
                    try { creds = JSON.parse(creds) } catch (e) { }
                }
                creds = decryptObject(creds)

                const token = creds.accessToken || creds.apiToken || creds.access_token
                const phoneId = creds.phoneNumberId || creds.phone_number_id
                const verify = creds.verifyToken || ''

                if (token && phoneId) {
                    provider = new MetaProvider(token, phoneId, verify)
                    connectionFound = true
                    await logDebug("Provider initialized with connection_id credentials")
                } else {
                    await logDebug("Credentials missing fields", creds)
                }
            } else {
                await logDebug("Connection has no credentials")
            }
        }

        if (!connectionFound) {
            await logDebug("Fallback: Searching for any active meta_whatsapp connection")
            const { data: conn } = await supabaseAdmin.from('integration_connections').select('*').eq('provider_key', 'meta_whatsapp').eq('status', 'active').limit(1).single()
            if (conn?.credentials) {
                const { decryptObject } = await import('../integrations/encryption')
                let creds = conn.credentials
                if (typeof creds === 'string') {
                    try { creds = JSON.parse(creds) } catch (e) { }
                }
                creds = decryptObject(creds)

                const token = creds.accessToken || creds.apiToken || creds.access_token
                const phoneId = creds.phoneNumberId || creds.phone_number_id
                const verify = creds.verifyToken || ''

                if (token && phoneId) {
                    provider = new MetaProvider(token, phoneId, verify)
                    await logDebug("Provider initialized with fallback connection")
                }
            } else {
                await logDebug("No fallback connection found")
            }
        }

        // Send Interactive Message
        await logDebug("Sending message to " + recipientPhone)
        const result = await provider.sendMessage({
            to: recipientPhone,
            content: {
                type: 'interactive_buttons',
                body: bodyText,
                header: { type: 'text', text: headerText },
                footer: footerText,
                buttons: [
                    { id: `approve_cart_${cartId}`, title: approveLabel },
                    { id: `reject_cart_${cartId}`, title: rejectLabel }
                ]
            }
        })

        await logDebug("Send Result", result)

        if (!result.success) throw new Error("Meta API Error: " + result.error)

        // 6. Save to Database (So it appears in chat)
        await logDebug("Saving to Inbox...")
        const { inboxService } = await import('../messaging/inbox-service')

        await inboxService.saveOutboundMessage(
            conversation.id,
            {
                type: 'interactive_buttons', // frontend needs to handle this or fallback
                // Fallback text is CRITICAL for display if component fails
                text: `[COTIZACIÓN] ${headerText}\n\n${bodyText}\n\n${footerText}\n\n[Botones: ${approveLabel} | ${rejectLabel}]`,
                header: { type: 'text', text: headerText },
                body: bodyText,
                footer: footerText,
                buttons: [
                    { id: `approve_cart_${cartId}`, title: approveLabel },
                    { id: `reject_cart_${cartId}`, title: rejectLabel }
                ]
            },
            result.messageId, // External ID from Meta
            'Agent', // Sender
            undefined, // ID autogenerated
            'whatsapp'
        )
        await logDebug("Saved to Inbox")

        revalidatePath('/crm/inbox')
        return { success: true }

    } catch (e: any) {
        console.error("Send Quote Error", e)
        await logDebug("EXCEPTION", e.message + " " + e.stack)
        return { success: false, error: e.message }
    }
}
