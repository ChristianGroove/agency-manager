"use server"
import { createClient } from "@/modules/core/database/supabase-server";

export interface RestoOrderHistoryItem {
    id: string
    created_at: string
    content: string
    status: string
    metadata: {
        type: string
        total: number
        items: { name: string; qty: number; price: number }[]
        address?: string
        customer_notes?: string
        order_status?: string
    }
}

export async function getRestoClientOrders(orgId: string, clientId: string): Promise<RestoOrderHistoryItem[]> {
    const supabase = (await createClient())

    try {
        // Encontramos todas las conversaciones de este cliente en esta org
        const { data: convs } = await supabase
            .from('conversations')
            .select('id')
            .eq('organization_id', orgId)
            .eq('client_id', clientId)

        if (!convs || convs.length === 0) return []

        const convIds = convs.map(c => c.id)

        // Extraemos todos los mensajes cuyo metadata.type sea 'resto_order'
        const { data: messages, error } = await supabase
            .from('messages')
            .select('id, created_at, content, status, metadata')
            .in('conversation_id', convIds)
            .contains('metadata', { type: 'resto_order' })
            .order('created_at', { ascending: false })

        if (error) {
            console.error("[getRestoClientOrders] Error fetching orders:", error)
            return []
        }

        return messages as RestoOrderHistoryItem[]

    } catch (error) {
        console.error("[getRestoClientOrders] Internal Catch Error:", error)
        return []
    }
}
