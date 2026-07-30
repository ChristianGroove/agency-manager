"use server"
import { CartItem } from "@/hooks/use-resto-cart"
import { normalizePhone } from "@/modules/infrastructure/utils/normalize-phone"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { createClient } from "@/modules/core/database/supabase-server";
import { supabaseAdmin } from "@/modules/core/database/supabase-admin";

export interface CheckoutPayload {
    orgId: string
    items: CartItem[]
    customerName: string
    customerPhone: string
    deliveryAddress?: string
    notes?: string
    restoMode: 'delivery' | 'pickup' | 'dine_in'
    tableId?: string | null
    tableIdentifier?: string | null
    sessionId?: string | null
    tipAmount: number
    paymentMethod: 'cash' | 'transfer' | 'pending'
}

export async function dispatchRestoOrder(payload: CheckoutPayload) {
    const supabase = supabaseAdmin

    if (payload.restoMode === 'dine_in') {
        throw new Error("Dine-in orders must use sendDineInRound from resto-session-actions.ts")
    }

    payload.customerPhone = normalizePhone(payload.customerPhone)

    try {
        // 1. Backend Price Validation (Seguridad Crítica)
        const subtotal = await calculateSecureCartTotal(payload.items, payload.orgId)
        const finalTotal = subtotal + payload.tipAmount

        // 2. Resolver WABA principal
        const { data: connection } = await supabase
            .from('integration_connections')
            .select('id, provider_key')
            .eq('organization_id', payload.orgId)
            .in('provider_key', ['whatsapp_cloud', 'meta_whatsapp'])
            .eq('status', 'active')
            .limit(1)
            .single()

        const connId = connection?.id || null

        // 3. Upsert Client (Only if phone is provided)
        let clientIdToUse = null
        let portalToken = null

        if (payload.customerPhone && payload.customerPhone.trim() !== '') {
            const { data: existingClient } = await supabase
                .from('leads')
                .select('id, portal_short_token')
                .eq('organization_id', payload.orgId)
                .eq('phone', payload.customerPhone)
                .maybeSingle()

            if (existingClient) {
                clientIdToUse = existingClient.id
                portalToken = existingClient.portal_short_token

                if (!portalToken) {
                    const { data: newToken } = await supabase.rpc('generate_short_token')
                    await supabase.from('leads').update({ portal_short_token: newToken }).eq('id', clientIdToUse).eq('organization_id', payload.orgId)
                    portalToken = newToken
                }

                await supabase.from('leads').update({
                    name: payload.customerName,
                    ...(payload.deliveryAddress ? { address: payload.deliveryAddress } : {})
                }).eq('id', clientIdToUse).eq('organization_id', payload.orgId)
            } else {
                const { data: newToken } = await supabase.rpc('generate_short_token')
                portalToken = newToken

                const { data: newClient, error: clientError } = await supabase
                    .from('leads')
                    .insert({
                        organization_id: payload.orgId,
                        name: payload.customerName,
                        phone: payload.customerPhone,
                        address: payload.deliveryAddress || null,
                        portal_short_token: portalToken
                    })
                    .select()
                    .single()

                if (clientError) throw new Error("Error creando cliente")
                clientIdToUse = newClient.id
            }
        }

        // 4. Create the formal Resto Order
        const orderPayload = {
            organization_id: payload.orgId,
            lead_id: clientIdToUse,
            total: finalTotal,
            tip_amount: payload.tipAmount,
            resto_mode: payload.restoMode,
            table_id: payload.tableId || null,
            kitchen_status: 'pending',
            payment_status: 'unpaid',
            payment_method: payload.paymentMethod === 'pending' ? 'cash' : payload.paymentMethod,
            delivery_address: payload.deliveryAddress || null,
            customer_notes: payload.notes || null,
            items_snapshot: payload.items.map(item => ({
                id: item.id,
                menuItemId: item.menuItemId,
                title: item.title,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity,
                modifiers: item.modifiers || [],
                notes: item.notes || null
            }))
        }

        const { data: newOrder, error: orderError } = await supabase
            .from('resto_orders')
            .insert(orderPayload)
            .select()
            .single()

        if (orderError) {
            console.error("[Resto Checkout] Error creando orden de restaurante:", orderError)
            throw new Error("Error DB: " + JSON.stringify(orderError))
        }

        // 5. Create WhatsApp Conversation & Message para el CRM
        let conversationId: string | null = null
        const { data: existingConvs } = await supabase
            .from('conversations')
            .select('id, connection_id')
            .eq('organization_id', payload.orgId)
            .eq('phone', payload.customerPhone)
            .order('updated_at', { ascending: false })
            .limit(1)

        if (existingConvs && existingConvs.length > 0) {
            conversationId = existingConvs[0].id
        } else {
            const { data: newConv } = await supabase
                .from('conversations')
                .insert({
                    organization_id: payload.orgId,
                    connection_id: connId,
                    client_id: clientIdToUse,
                    channel: 'whatsapp',
                    phone: payload.customerPhone,
                    status: 'open',
                    state: 'active',
                    unread_count: 1,
                    last_message_at: new Date().toISOString()
                })
                .select()
                .single()
            if (newConv) conversationId = newConv.id
        }

        let messageId = null
        if (conversationId) {
            const { data: newMessage } = await supabase
                .from('messages')
                .insert({
                    organization_id: payload.orgId,
                    conversation_id: conversationId,
                    direction: 'inbound',
                    content: `🛍️ Nuevo Pedido Online por $${finalTotal.toLocaleString('es-CO')}\n\nCliente: ${payload.customerName}\n${payload.deliveryAddress ? `Dir: ${payload.deliveryAddress}\n` : ''}\nRevisar módulo de restaurante.`,
                    channel: 'whatsapp',
                    metadata: { type: 'resto_order', order_id: newOrder.id },
                    status: 'delivered'
                })
                .select()
                .single()
            if (newMessage) messageId = newMessage.id
        }

        return { success: true, conversationId, messageId: newOrder.id, portalToken } // Return order ID as tracker id!

    } catch (error: any) {
        console.error("[Resto Checkout] Error:", error)
        return { success: false, error: error.message || "Error en checkout" }
    }
}

/**
 * Validates the local cart against the current database state.
 * Returns the corrected cart and any alert messages (e.g., price changed, sold out).
 */
export async function validateCartItems(localItems: CartItem[], orgId: string) {
    const supabase = await createClient()

    if (!localItems || localItems.length === 0) {
        return { valid: true, items: [], messages: [] }
    }

    const itemIds = Array.from(new Set(localItems.map(i => i.menuItemId)))

    // Fetch all relevant menu items with their modifiers
    const { data: dbItems, error } = await supabase
        .from('resto_menu_items')
        .select(`
            *,
            resto_item_modifier_groups(
                order_index,
                resto_modifier_groups(*)
            )
        `)
        .in('id', itemIds)
        .eq('organization_id', orgId)
        .is('deleted_at', null)

    if (error) {
        console.error("Error validating cart:", error)
        throw new Error("No se pudo validar el carrito.")
    }

    const messages: string[] = []
    const validatedItems: CartItem[] = []
    let isValid = true

    for (const local of localItems) {
        const dbItem = dbItems.find(i => i.id === local.menuItemId)

        if (!dbItem || !dbItem.is_visible) {
            messages.push(`"${local.title}" ya no está disponible en el menú.`)
            isValid = false
            continue
        }

        if (!dbItem.is_available) {
            messages.push(`"${dbItem.name}" se ha agotado temporalmente.`)
            isValid = false
            continue
        }

        // Security check: validate quantity > 0
        if (!local.quantity || typeof local.quantity !== 'number' || local.quantity <= 0 || !Number.isInteger(local.quantity)) {
            messages.push(`La cantidad para "${dbItem.name}" debe ser un número entero positivo.`)
            isValid = false
            continue
        }

        // Calculate actual price (handle $0 promotional price correctly)
        const promoPrice = dbItem.metadata?.promotional_price
        const basePrice = (typeof promoPrice === 'number' && promoPrice >= 0) ? promoPrice : (dbItem.base_price || 0)
        let modifiersPrice = 0
        const validatedModifiers = []

        // Map db modifiers for easy lookup safely
        const dbModifiers = (dbItem.resto_item_modifier_groups || [])
            .map((link: any) => link?.resto_modifier_groups)
            .filter(Boolean)

        for (const localMod of (local.modifiers || [])) {
            const dbGroup = dbModifiers.find((g: any) => g.name === localMod.groupName)
            if (dbGroup) {
                const dbOption = (dbGroup.options || []).find((o: any) => o.name === localMod.optionName)
                if (dbOption) {
                    const price = dbOption.price || 0
                    modifiersPrice += price
                    validatedModifiers.push({
                        groupName: dbGroup.name,
                        optionName: dbOption.name,
                        price: price
                    })
                } else {
                    messages.push(`La opción "${localMod.optionName}" para "${dbItem.name}" ya no existe.`)
                    isValid = false
                }
            } else {
                messages.push(`La opción "${localMod.optionName}" para "${dbItem.name}" ya no está disponible.`)
                isValid = false
            }
        }

        const trueTotalPrice = basePrice + modifiersPrice

        if (trueTotalPrice !== local.price) {
            messages.push(`El precio de "${dbItem.name}" ha sido actualizado.`)
            isValid = false
        }

        validatedItems.push({
            ...local,
            title: dbItem.name,
            price: trueTotalPrice,
            modifiers: validatedModifiers
        })
    }

    return {
        valid: isValid,
        items: validatedItems,
        messages: Array.from(new Set(messages)) // Deduplicate messages
    }
}

/**
 * Server-side calculator to prevent price tampering during final checkout.
 * Returns the exact total and throws an error if validation fails.
 */
export async function calculateSecureCartTotal(localItems: CartItem[], orgId: string): Promise<number> {
    const { valid, items } = await validateCartItems(localItems, orgId)
    
    if (!valid) {
        throw new Error("El carrito está desactualizado. Por favor, revísalo antes de continuar.")
    }

    return items.reduce((total, item) => total + (item.price * item.quantity), 0)
}



export async function updateClientAddress(token: string, clientId: string, address: string) {
    const supabase = (await createClient())

    try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
        let clientQuery = supabase
            .from('leads')
            .select('id, organization_id')
        if (isUuid) clientQuery = clientQuery.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
        else clientQuery = clientQuery.eq('portal_short_token', token)

        const { data: tokenClient, error: tokenError } = await clientQuery.single()
        if (tokenError || !tokenClient || tokenClient.id !== clientId) throw new Error('Unauthorized')

        const { error } = await supabase
            .from('leads')
            .update({ address })
            .eq('id', clientId)
            .eq('organization_id', tokenClient.organization_id)

        if (error) throw error
        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        console.error("[updateClientAddress] Error:", error)
        return { success: false, error: error.message }
    }
}

export async function updateRestoOrderStatus(messageId: string, status: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) {
        console.error("Unauthorized")
        return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()
    const { data: msg } = await supabase.from('messages').select('metadata').eq('id', messageId).eq('organization_id', orgId).single()
    
    if (msg) {
        await supabase.from('messages').update({
            status: 'read',
            metadata: { ...msg.metadata, order_status: status }
        }).eq('id', messageId).eq('organization_id', orgId)
    }
    
    return { success: true }
}
