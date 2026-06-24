"use server"
import { RestoOrderHistoryItem } from "./resto-orders-actions"
import { createClient } from "@/modules/core/database/supabase-server";

/**
 * Función para que la PWA del cliente pueda recuperar sus pedidos
 * basándose únicamente en los messageIds que guardó en su LocalStorage (Zustand),
 * permitiendo una experiencia "Guest Checkout" completa sin login.
 */
export async function getRestoGuestOrders(orderIds: string[], orgId: string): Promise<RestoOrderHistoryItem[]> {
    if (!orderIds || orderIds.length === 0) return []

    const supabase = (await createClient())

    try {
        const { data: orders, error } = await supabase
            .from('resto_orders')
            .select('*')
            .eq('organization_id', orgId)
            .in('id', orderIds)
            .order('created_at', { ascending: false })
            .limit(10) // Limitamos a los 10 más recientes por desempeño del cliente Anónimo

        if (error) {
            console.error("[getRestoGuestOrders] Error:", error)
            return []
        }

        return orders as RestoOrderHistoryItem[]

    } catch (error) {
        console.error("[getRestoGuestOrders] Catch:", error)
        return []
    }
}
