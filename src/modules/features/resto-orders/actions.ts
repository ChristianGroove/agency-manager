"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"

export async function getRestoOrders() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('resto_orders')
        .select(`
            *,
            leads (
                name,
                phone
            )
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching resto orders:", error)
        return []
    }

    return data
}

export async function updateRestoOrderStatus(orderId: string, newStatus: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Unauthorized" }

    const supabase = await createClient()

    const { error } = await supabase
        .from('resto_orders')
        .update({ kitchen_status: newStatus })
        .eq('id', orderId)
        .eq('organization_id', orgId)

    if (error) {
        console.error("Error updating resto order status:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/resto-orders')
    revalidatePath('/resto-orders/kds')
    return { success: true }
}
