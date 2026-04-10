"use server"

import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { RestoOrderHistoryItem } from "./resto-orders-actions"

/**
 * Función para que la PWA del cliente pueda recuperar sus pedidos
 * basándose únicamente en los messageIds que guardó en su LocalStorage (Zustand),
 * permitiendo una experiencia "Guest Checkout" completa sin login.
 */
export async function getRestoGuestOrders(messageIds: string[], orgId: string): Promise<RestoOrderHistoryItem[]> {
    if (!messageIds || messageIds.length === 0) return []

    const supabase = supabaseAdmin

    try {
        const { data: messages, error } = await supabase
            .from('messages')
            .select('id, created_at, content, status, metadata')
            .eq('organization_id', orgId)
            .in('id', messageIds)
            .order('created_at', { ascending: false })
            .limit(10) // Limitamos a los 10 más recientes por desempeño del cliente Anónimo

        if (error) {
            console.error("[getRestoGuestOrders] Error:", error)
            return []
        }

        return messages as RestoOrderHistoryItem[]

    } catch (error) {
        console.error("[getRestoGuestOrders] Catch:", error)
        return []
    }
}
