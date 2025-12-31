'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"

export interface PaymentMethod {
    id: string
    organization_id: string
    type: 'MANUAL' | 'GATEWAY'
    title: string
    details: any
    instructions?: string
    is_active: boolean
    display_order: number
}

export async function getPaymentMethods() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('organization_payment_methods')
        .select('*')
        .eq('organization_id', orgId)
        .order('display_order', { ascending: true })

    if (error) {
        console.error("Error fetching payment methods:", error)
        return []
    }

    return data as PaymentMethod[]
}

export async function createPaymentMethod(formData: {
    title: string
    type: 'MANUAL' | 'GATEWAY'
    details: any
    instructions?: string
}) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    // Get max order to append
    const { data: maxOrderData } = await supabase
        .from('organization_payment_methods')
        .select('display_order')
        .eq('organization_id', orgId)
        .order('display_order', { ascending: false })
        .limit(1)
        .single()

    const nextOrder = (maxOrderData?.display_order || 0) + 1

    const { error } = await supabase
        .from('organization_payment_methods')
        .insert({
            organization_id: orgId,
            title: formData.title,
            type: formData.type,
            details: formData.details,
            instructions: formData.instructions,
            display_order: nextOrder,
            is_active: true
        })

    if (error) {
        console.error("Error creating payment method:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/settings')
    return { success: true }
}

export async function updatePaymentMethod(id: string, updates: Partial<PaymentMethod>) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    const { error } = await supabase
        .from('organization_payment_methods')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', orgId) // Security check

    if (error) {
        console.error("Error updating payment method:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/settings')
    return { success: true }
}

export async function deletePaymentMethod(id: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    const { error } = await supabase
        .from('organization_payment_methods')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) {
        console.error("Error deleting payment method:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/settings')
    return { success: true }
}

export async function reorderPaymentMethods(items: { id: string, order: number }[]) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    // This could be optimized with a batch RPC call if needed, but loop is fine for < 20 items
    for (const item of items) {
        await supabase
            .from('organization_payment_methods')
            .update({ display_order: item.order })
            .eq('id', item.id)
            .eq('organization_id', orgId)
    }

    revalidatePath('/settings')
    return { success: true }
}
