"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { CartItem } from "@/hooks/use-resto-cart"

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

    try {
        // En un caso real, buscaríamos la conexión activa de WhatsApp del restaurante 
        // para que el ID del canal entrante sea correcto.
        const { data: connection } = await supabase
            .from('integration_connections')
            .select('id, platform')
            .eq('organization_id', payload.orgId)
            .eq('platform', 'whatsapp')
            .eq('status', 'active')
            .limit(1)
            .single()

        // 1. Upsert Client (Lead)
        // Buscamos si el teléfono ya existe. Si no, lo creamos.
        let clientIdToUse = null

        const { data: existingClient } = await supabase
            .from('clients')
            .select('id')
            .eq('organization_id', payload.orgId)
            .eq('phone', payload.customerPhone)
            .single()

        // Buscar un usuario dueño de la organización para asignarle este contacto/lead
        const { data: orgMember } = await supabase
            .from('organization_members')
            .select('user_id')
            .eq('organization_id', payload.orgId)
            .limit(1)
            .single()

        const fallbackUserId = orgMember?.user_id

        if (existingClient) {
            clientIdToUse = existingClient.id
            // Actualizar nombre en caso de que el cliente (dueño del teléfono) haya proveído uno nuevo en esta compra
            await supabase
                .from('clients')
                .update({ name: payload.customerName })
                .eq('id', clientIdToUse)
        } else {
            const { data: newClient, error: clientError } = await supabase
                .from('clients')
                .insert({
                    organization_id: payload.orgId,
                    name: payload.customerName,
                    phone: payload.customerPhone,
                    user_id: fallbackUserId
                })
                .select()
                .single()

            if (clientError) {
                console.error("Detalle Error Creando Cliente:", clientError)
                throw new Error("Error creando cliente")
            }
            clientIdToUse = newClient.id
        }

        // 2. Crear o Buscar Conversación Abierta
        const connId = connection?.id || null

        let conversationId = null

        // Build query carefully since eq() with null can be tricky, 
        // but Supabase usually handles eq(null) as IS NULL or we can use match.
        const query = supabase
            .from('conversations')
            .select('id')
            .eq('organization_id', payload.orgId)
            .eq('client_id', clientIdToUse)
            .eq('status', 'open')

        if (connId) {
            query.eq('connection_id', connId)
        } else {
            query.is('connection_id', null)
        }

        const { data: activeConv } = await query.single()

        if (activeConv) {
            conversationId = activeConv.id
        } else {
            const { data: newConv, error: convError } = await supabase
                .from('conversations')
                .insert({
                    organization_id: payload.orgId,
                    connection_id: connId,
                    client_id: clientIdToUse,
                    channel: connection ? connection.platform : 'whatsapp',
                    status: 'open',
                    unread_count: 1
                })
                .select()
                .single()

            if (convError) {
                console.error("Detalle Error Creando Conversación:", convError)
                throw new Error("Error creando conversación")
            }
            conversationId = newConv.id
        }

        // 3. Crear el Mensaje tipo 'Order Widget'
        // El contenido será un JSON que el frontend del Inbox podrá interpretar 
        // para renderizar el "OrderWidget.tsx" en lugar de texto plano.
        const orderData = {
            type: "resto_order",
            total: payload.total,
            items: payload.items.map(i => ({ name: i.title, qty: i.quantity, price: i.price })),
            address: payload.deliveryAddress,
            customer_notes: payload.notes
        }

        const { error: msgError } = await supabase
            .from('messages')
            .insert({
                organization_id: payload.orgId,
                conversation_id: conversationId,
                direction: 'inbound',
                content: `🛍️ Nuevo Pedido por $${payload.total}\n\nCliente: ${payload.customerName}\nDirección: ${payload.deliveryAddress}\n\nRevisar detalles en Pixy CRM.`,
                channel: connection ? connection.platform : 'whatsapp',
                metadata: orderData, // <-- La Magia Real está aquí
                status: 'delivered'
            })

        if (msgError) throw msgError

        return { success: true, conversationId }

    } catch (error: any) {
        console.error("[Resto Checkout] Error:", error)
        return { success: false, error: error.message }
    }
}
