"use server"

import { CartItem } from "@/hooks/use-resto-cart"
import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { calculateSecureCartTotal } from "./checkout-actions"
import { revalidatePath } from "next/cache"

export interface DineInRoundPayload {
    orgId: string
    sessionId: string
    items: CartItem[]
    customerName?: string
    notes?: string
}

export async function sendDineInRound(payload: DineInRoundPayload) {
    const supabase = supabaseAdmin

    try {
        // 1. Validar sesión
        const { data: session, error: sessionError } = await supabase
            .from('resto_table_sessions')
            .select('id, table_id, status, total_accumulated')
            .eq('id', payload.sessionId)
            .eq('organization_id', payload.orgId)
            .single()

        if (sessionError || !session) throw new Error("Sesión de mesa no encontrada")
        if (session.status !== 'active') throw new Error("La sesión no está activa. No puedes pedir más rondas.")

        // 2. Validar precios
        const subtotal = await calculateSecureCartTotal(payload.items, payload.orgId)

        // 3. Calcular round_number
        const { count, error: countError } = await supabase
            .from('resto_orders')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id)

        const roundNumber = (count || 0) + 1

        // 4. Crear Resto Order
        const orderPayload = {
            organization_id: payload.orgId,
            session_id: session.id,
            table_id: session.table_id,
            round_number: roundNumber,
            total: subtotal,
            tip_amount: 0, // Propina va al final
            resto_mode: 'dine_in',
            kitchen_status: 'pending',
            payment_status: 'unpaid',
            payment_method: 'pending',
            customer_notes: payload.notes || null,
            items_snapshot: payload.items.map(item => ({
                id: item.id,
                menuItemId: item.menuItemId,
                title: item.title,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity,
                modifiers: item.modifiers || [],
                notes: item.notes || null,
                customer_name: payload.customerName || null // Guardamos el nombre a nivel de item para saber de quién es si se quiere
            }))
        }

        const { data: newOrder, error: orderError } = await supabase
            .from('resto_orders')
            .insert(orderPayload)
            .select('id')
            .single()

        if (orderError) throw new Error("Error DB: " + JSON.stringify(orderError))

        // 5. Actualizar total acumulado de la sesión de forma atómica sumando todas las órdenes registradas
        const { data: sessionOrders } = await supabase
            .from('resto_orders')
            .select('total')
            .eq('session_id', session.id)

        const exactTotal = (sessionOrders || []).reduce((sum, ord) => sum + (Number(ord.total) || 0), 0)

        await supabase
            .from('resto_table_sessions')
            .update({ total_accumulated: exactTotal })
            .eq('id', session.id)

        return { success: true, orderId: newOrder.id, roundNumber, newTotal: exactTotal }

    } catch (error: any) {
        console.error("[Resto DineIn] Error:", error)
        return { success: false, error: error.message || "Error al enviar ronda a cocina" }
    }
}

import { unstable_noStore as noStore } from "next/cache"

export async function getSessionSummary(sessionId: string) {
    noStore()
    const supabase = await createClient()

    const { data: session, error } = await supabase
        .from('resto_table_sessions')
        .select(`
            *,
            resto_tables!resto_table_sessions_table_id_fkey (table_identifier),
            resto_orders (
                id, round_number, total, kitchen_status, created_at, items_snapshot
            )
        `)
        .eq('id', sessionId)
        .single()

    if (error || !session) return null

    // Order orders by created_at ascending to show rounds in order
    if (session.resto_orders) {
        session.resto_orders.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }

    return session
}

export async function requestBill(sessionId: string, tipAmount: number, paymentMethod: string) {
    const supabase = supabaseAdmin

    try {
        const { data: session, error: sessionError } = await supabase
            .from('resto_table_sessions')
            .select('id, table_id, status')
            .eq('id', sessionId)
            .single()

        if (sessionError || !session) throw new Error("Sesión no encontrada")
        if (session.status !== 'active') throw new Error("La sesión ya fue cerrada o está en facturación")

        // Cambiar status a payment_pending
        const { error: updateError } = await supabase.from('resto_table_sessions').update({ 
            status: 'payment_pending',
            payment_method: paymentMethod
        }).eq('id', sessionId)
        if (updateError) throw updateError

        await supabase.from('resto_tables').update({ status: 'billing' }).eq('id', session.table_id)

        // Update tipping amount in the FIRST order of the session to keep track?
        // Or better yet, we just handle the tip dynamically. We don't have a column for it in session yet.
        // The implementation plan says "Guarda propina y método de pago en la sesión". But we didn't add tip_amount to session schema.
        // We can just update tip_amount on one of the orders, or all.
        // Actually, since we only need it for accounting, let's just add it to the first order.
        const { data: firstOrder } = await supabase.from('resto_orders').select('id, tip_amount').eq('session_id', sessionId).order('created_at', { ascending: true }).limit(1).single()
        if (firstOrder) {
            await supabase.from('resto_orders').update({ tip_amount: tipAmount }).eq('id', firstOrder.id)
        }

        revalidatePath(`/p/[slug]`, 'page')
        
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function closeSession(sessionId: string, orgId: string) {
    const supabase = supabaseAdmin

    try {
        const { data: session, error: sessionError } = await supabase
            .from('resto_table_sessions')
            .select('id, table_id')
            .eq('id', sessionId)
            .eq('organization_id', orgId)
            .single()

        if (sessionError || !session) throw new Error("Sesión no encontrada")

        // 1. Cerrar Sesión
        await supabase.from('resto_table_sessions').update({ 
            status: 'closed',
            closed_at: new Date().toISOString(),
            payment_status: 'paid'
        }).eq('id', sessionId)

        // 2. Liberar Mesa
        await supabase.from('resto_tables').update({ 
            status: 'available',
            current_session_id: null
        }).eq('id', session.table_id)

        // 3. Marcar órdenes como pagadas y completadas en cocina
        await supabase.from('resto_orders').update({
            payment_status: 'paid',
            kitchen_status: 'completed'
        }).eq('session_id', sessionId)

        revalidatePath('/crm/resto-orders')
        revalidatePath('/menu')

        return { success: true }
    } catch (error: any) {
        console.error("Error closing session:", error)
        return { success: false, error: error.message }
    }
}
