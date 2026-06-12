'use server'

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { sanitizePaymentMethodsForClient } from "./payment-methods-sanitizer"

const PUBLIC_PAYMENT_METHOD_CREATE_ERROR = "No se pudo crear el metodo de pago"
const PUBLIC_PAYMENT_METHOD_UPDATE_ERROR = "No se pudo actualizar el metodo de pago"
const PUBLIC_PAYMENT_METHOD_DELETE_ERROR = "No se pudo eliminar el metodo de pago"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizePaymentMethodError(error: unknown) {
    if (error instanceof Error) return { name: error.name }

    if (error && typeof error === 'object') {
        return {
            code: (error as any).code,
            status: (error as any).status,
            statusCode: (error as any).statusCode,
            hasMessage: typeof (error as any).message === 'string' && (error as any).message.length > 0,
        }
    }

    return { type: typeof error }
}

function logPaymentMethodError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizePaymentMethodError(error))
}

function paymentMethodErrorMessage(error: unknown, fallback: string) {
    if (isDeployedRuntime()) return fallback
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
        return error.message
    }
    return fallback
}

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
        logPaymentMethodError("Error fetching payment methods:", error)
        return []
    }

    return sanitizePaymentMethodsForClient(data as PaymentMethod[])
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
        logPaymentMethodError("Error creating payment method:", error)
        return { success: false, error: paymentMethodErrorMessage(error, PUBLIC_PAYMENT_METHOD_CREATE_ERROR) }
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
        logPaymentMethodError("Error updating payment method:", error)
        return { success: false, error: paymentMethodErrorMessage(error, PUBLIC_PAYMENT_METHOD_UPDATE_ERROR) }
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
        logPaymentMethodError("Error deleting payment method:", error)
        return { success: false, error: paymentMethodErrorMessage(error, PUBLIC_PAYMENT_METHOD_DELETE_ERROR) }
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

