'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

/**
 * Update the status of a cleaning job (appointment)
 */
export async function updateJobStatus(jobId: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled') {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', jobId)
        .eq('organization_id', orgId)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/cleaning')
    return { success: true }
}

/**
 * Generates a draft invoice from a completed cleaning job
 */
export async function generateInvoiceFromJob(jobId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    try {
        // 1. Fetch Job Details
        const { data: job, error: jobError } = await supabase
            .from('appointments')
            .select(`
                *,
                client:clients(id, first_name, last_name, email, address),
                service:cleaning_services(name, base_price, price_unit)
            `)
            .eq('id', jobId)
            .eq('organization_id', orgId)
            .single()

        if (jobError || !job) throw new Error("Job not found")

        // 2. Prepare Invoice Data
        const invoiceItems = [{
            description: `Servicio de Limpieza: ${job.service?.name || job.title}`,
            quantity: 1,
            price: job.service?.base_price || 0
        }]

        const total = invoiceItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)

        // 3. Create Invoice (Draft)
        // Note: Number generation usually happens via trigger or separate logic. 
        // For now we rely on DB default or trigger if it exists. 
        // If 'number' is required and not auto-generated, we might need a placeholder or fetch next sequence.
        // Assuming simple insert for now.

        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .insert({
                organization_id: orgId,
                client_id: job.client_id,
                date: new Date().toISOString(),
                status: 'draft',
                items: invoiceItems,
                total: total,
                service_id: job.service_id, // Link back to service if needed
                // metadata: { source_job_id: jobId } // Good practice for linking
            })
            .select('id')
            .single()

        if (invoiceError) throw invoiceError

        // 4. Return Success with Redirect URL
        return { success: true, invoiceId: invoice.id }

    } catch (error: any) {
        console.error("Error generating invoice:", error)
        return { success: false, error: error.message }
    }
}
