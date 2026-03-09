"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { requireSuperAdmin } from "@/lib/auth/platform-roles"
import { revalidatePath } from "next/cache"

/**
 * Get all organizations with their SaaS subscription data
 */
export async function getAllPlatformSubscriptions() {
    await requireSuperAdmin()

    const { data, error } = await supabaseAdmin
        .from('organizations')
        .select(`
            id,
            name,
            slug,
            subscription:saas_subscriptions(
                id,
                status,
                current_period_end,
                payment_gateway,
                last_payment_at,
                plan:saas_products(name, base_price)
            )
        `)
        .order('name')

    if (error) {
        console.error('Error fetching platform subscriptions:', error)
        return []
    }

    return data || []
}

/**
 * Manual action: Update subscription status
 */
export async function updateSubscriptionStatusAdmin(subscriptionId: string, status: any) {
    await requireSuperAdmin()

    const { error } = await supabaseAdmin
        .from('saas_subscriptions')
        .update({
            status,
            updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)

    if (error) throw error

    revalidatePath('/platform/admin')
    return { success: true }
}
