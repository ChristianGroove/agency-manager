"use server"
import { createClient } from "@/modules/core/database/supabase-server";

export interface RestoOrderHistoryItem {
    id: string
    created_at: string
    total: number
    kitchen_status: string
    payment_status: string
    resto_mode: string
    items_snapshot: any[]
    delivery_address?: string
    customer_notes?: string
    metadata?: any
}

export async function getRestoClientOrders(orgId: string, clientId: string): Promise<RestoOrderHistoryItem[]> {
    const supabase = (await createClient())

    try {
        const { data: orders, error } = await supabase
            .from('resto_orders')
            .select('*')
            .eq('organization_id', orgId)
            .eq('lead_id', clientId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error("[getRestoClientOrders] Error fetching orders:", error)
            return []
        }

        return orders as RestoOrderHistoryItem[]

    } catch (error) {
        console.error("[getRestoClientOrders] Internal Catch Error:", error)
        return []
    }
}
