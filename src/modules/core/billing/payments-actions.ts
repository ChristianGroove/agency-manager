'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

export async function getPaymentTransactions() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    // 1. Fetch transactions for this organization directly
    // This is more reliable than overlapping invoice IDs, as we now enforce organization_id on transactions
    const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching payment transactions:", error)
        return []
    }

    return data
}

export async function registerManualPayment(invoiceId: string) {
    const supabase = await createClient()

    // 1. Get Invoice Details for Total
    const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .select('total, status')
        .eq('id', invoiceId)
        .single()

    if (invError || !invoice) {
        return { success: false, error: "Invoice not found" }
    }

    if (invoice.status === 'paid') {
        return { success: true, message: "Already paid" }
    }

    // 2. Use the shared registerPayment action
    // We import dynamically to avoid circular dependencies if any, though likely safe valid module import
    const { registerPayment } = await import("@/modules/core/billing/invoices-actions")

    try {
        await registerPayment(invoiceId, invoice.total, "Pago manual registrado desde detalles del cliente")
        return { success: true }
    } catch (error: any) {
        console.error("Error registering manual payment:", error)
        return { success: false, error: error.message }
    }
}
