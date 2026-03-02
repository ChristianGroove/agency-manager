"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { CartItem } from "@/hooks/use-resto-cart"
import { normalizePhone } from "@/lib/normalize-phone"

export interface CheckoutPayload {
    orgId: string
    items: CartItem[]
    total: number
    customerName: string
    customerPhone: string
    deliveryAddress?: string
    notes?: string
}

export async function dispatchRestoOrder(payload: CheckoutPayload) {
    const supabase = supabaseAdmin

    // Normalizar teléfono al formato internacional (ej. 3001234567 → 573001234567)
    payload.customerPhone = normalizePhone(payload.customerPhone)

    try {
        // ═══════════════════════════════════════════════════════════
        // 0. Resolver el canal WABA principal de la organización
        // ═══════════════════════════════════════════════════════════
        const { data: connection } = await supabase
            .from('integration_connections')
            .select('id, provider_key, metadata')
            .eq('organization_id', payload.orgId)
            .in('provider_key', ['whatsapp_cloud', 'meta_whatsapp'])
            .eq('status', 'active')
            .limit(1)
            .single()

        const connId = connection?.id || null

        // ═══════════════════════════════════════════════════════════
        // 1. PHONE-FIRST: Buscar conversación existente por teléfono
        //    Esto cruza tanto lead_id como client_id conversations
        // ═══════════════════════════════════════════════════════════
        let conversationId: string | null = null

        const { data: existingConvs } = await supabase
            .from('conversations')
            .select('id, connection_id, client_id, lead_id, state')
            .eq('organization_id', payload.orgId)
            .eq('phone', payload.customerPhone)
            .order('updated_at', { ascending: false })
            .limit(5)

        if (existingConvs && existingConvs.length > 0) {
            // Priorizar: conversación CON canal vinculado (WABA real) > sin canal
            const withChannel = existingConvs.find(c => c.connection_id !== null)
            const anyActive = existingConvs.find(c => c.state === 'active')

            const bestMatch = withChannel || anyActive || existingConvs[0]
            conversationId = bestMatch.id

            // Si la conversación estaba archivada, reactivarla
            if (bestMatch.state !== 'active') {
                await supabase
                    .from('conversations')
                    .update({ state: 'active', status: 'open', updated_at: new Date().toISOString() })
                    .eq('id', conversationId)
            }

            console.log(`[Resto Checkout] ✅ Reutilizando conversación existente: ${conversationId} (connection: ${bestMatch.connection_id || 'none'})`)
        }

        // ═══════════════════════════════════════════════════════════
        // 2. Upsert Client (para el Portal Token y perfil CRM)
        // ═══════════════════════════════════════════════════════════
        let clientIdToUse = null
        let portalToken = null

        const { data: existingClient } = await supabase
            .from('clients')
            .select('id, portal_short_token')
            .eq('organization_id', payload.orgId)
            .eq('phone', payload.customerPhone)
            .maybeSingle()

        const { data: orgMember } = await supabase
            .from('organization_members')
            .select('user_id')
            .eq('organization_id', payload.orgId)
            .limit(1)
            .maybeSingle()

        const fallbackUserId = orgMember?.user_id

        if (existingClient) {
            clientIdToUse = existingClient.id
            portalToken = existingClient.portal_short_token

            if (!portalToken) {
                const { data: newToken } = await supabase.rpc('generate_short_token')
                await supabase.from('clients').update({ portal_short_token: newToken }).eq('id', clientIdToUse)
                portalToken = newToken
            }

            await supabase.from('clients').update({ name: payload.customerName }).eq('id', clientIdToUse)
        } else {
            const { data: newToken } = await supabase.rpc('generate_short_token')
            portalToken = newToken

            const { data: newClient, error: clientError } = await supabase
                .from('clients')
                .insert({
                    organization_id: payload.orgId,
                    name: payload.customerName,
                    phone: payload.customerPhone,
                    user_id: fallbackUserId,
                    portal_short_token: portalToken
                })
                .select()
                .single()

            if (clientError) {
                console.error("Detalle Error Creando Cliente:", clientError)
                throw new Error("Error creando cliente")
            }
            clientIdToUse = newClient.id
        }

        // ═══════════════════════════════════════════════════════════
        // 3. Si encontramos conversación existente, vincular client_id
        //    (la conversación puede haber sido creada por el webhook con lead_id solamente)
        // ═══════════════════════════════════════════════════════════
        if (conversationId && clientIdToUse) {
            await supabase
                .from('conversations')
                .update({ client_id: clientIdToUse })
                .eq('id', conversationId)
                .is('client_id', null) // Solo si no tiene client_id aún
        }

        // ═══════════════════════════════════════════════════════════
        // 4. SOLO COMO FALLBACK: Crear conversación si no se encontró ninguna
        // ═══════════════════════════════════════════════════════════
        if (!conversationId) {
            console.log(`[Resto Checkout] No se encontró conversación existente. Creando nueva con connection: ${connId}`)

            const { data: newConv, error: convError } = await supabase
                .from('conversations')
                .insert({
                    organization_id: payload.orgId,
                    connection_id: connId, // Vincular al canal WABA real
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

            if (convError) {
                console.error("Detalle Error Creando Conversación:", convError)
                throw new Error("Error creando conversación")
            }
            conversationId = newConv.id
        }

        // ═══════════════════════════════════════════════════════════
        // 5. Insertar Mensaje tipo Order Widget
        // ═══════════════════════════════════════════════════════════
        const orderData = {
            type: "resto_order",
            total: payload.total,
            items: payload.items.map(i => ({ name: i.title, qty: i.quantity, price: i.price })),
            address: payload.deliveryAddress,
            customer_notes: payload.notes
        }

        const { data: newMessage, error: msgError } = await supabase
            .from('messages')
            .insert({
                organization_id: payload.orgId,
                conversation_id: conversationId,
                direction: 'inbound',
                content: `🛍️ Nuevo Pedido por $${payload.total}\n\nCliente: ${payload.customerName}\nDirección: ${payload.deliveryAddress}\n\nRevisar detalles en Pixy CRM.`,
                channel: 'whatsapp',
                metadata: orderData,
                status: 'delivered'
            })
            .select('id')
            .single()

        if (msgError) throw msgError

        return { success: true, conversationId, messageId: newMessage.id, portalToken }

    } catch (error: any) {
        console.error("[Resto Checkout] Error:", error)
        return { success: false, error: error.message }
    }
}

export async function updateRestoOrderStatus(messageId: string, status: 'read' | 'shipped' | 'completed' | 'failed') {
    const supabase = supabaseAdmin

    try {
        // 1. Obtener metadatos actuales
        const { data: current, error: fError } = await supabase
            .from('messages')
            .select('metadata')
            .eq('id', messageId)
            .single()

        if (fError) throw fError

        // 2. Mezclar el nuevo estado logístico
        const newMetadata = {
            ...(current?.metadata || {}),
            order_status: status
        }

        // 3. Status compatible con DB
        // shipped y completed se almacenan en metadata.order_status
        // El campo messages.status usa 'read' para shipped, y el status original para completed
        const dbStatus = (status === 'shipped') ? 'read' : (status === 'completed') ? 'read' : status

        const { error } = await supabase
            .from('messages')
            .update({
                status: dbStatus,
                metadata: newMetadata
            })
            .eq('id', messageId)

        if (error) throw error

        return { success: true }
    } catch (error: any) {
        console.error("[Resto Update Status] Error:", error)
        return { success: false, error: error.message }
    }
}
