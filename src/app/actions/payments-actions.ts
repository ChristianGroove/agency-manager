'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/lib/actions/organizations"

export async function getPaymentTransactions() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    // 1. Get all invoices belonging to this organization
    const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('id')
        .eq('organization_id', orgId)

    if (invError || !invoices || invoices.length === 0) {
        return [] // No invoices = No payments possible logic
    }

    const invoiceIds = invoices.map(inv => inv.id)

    // 2. Fetch transactions that contain any of these invoice IDs
    // Assuming invoice_ids is an array column
    const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .overlaps('invoice_ids', invoiceIds)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching payment transactions:", error)
        return []
    }

    return data
}
