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

export async function getOperationsMetrics(date: string) {
    const supabase = await createClient()
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    try {
        const { data: jobs, error } = await supabase
            .from('appointments')
            .select(`
                status, 
                cleaning_services!inner(base_price)
            `)
            .gte('start_time', startOfDay.toISOString())
            .lte('start_time', endOfDay.toISOString())
            .eq('organization_id', await getCurrentOrganizationId())

        if (error) throw error

        const metrics = {
            total: jobs.length,
            pending: jobs.filter(j => j.status === 'pending' || j.status === 'assigned').length,
            in_progress: jobs.filter(j => j.status === 'in_progress').length,
            completed: jobs.filter(j => j.status === 'completed').length,
            revenue: jobs.reduce((acc, curr) => acc + (curr.cleaning_services?.base_price || 0), 0)
        }

        return metrics
    } catch (error) {
        console.error('Error fetching operations metrics:', error)
        return {
            total: 0,
            pending: 0,
            in_progress: 0,
            completed: 0,
            revenue: 0
        }
    }
}

export async function getWeeklyRevenue() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    // Last 7 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 6) // 7 days including today

    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)

    try {
        const { data: jobs, error } = await supabase
            .from('appointments')
            .select(`
                start_time, 
                cleaning_services!inner(base_price)
            `)
            .eq('status', 'completed')
            .gte('start_time', startDate.toISOString())
            .lte('start_time', endDate.toISOString())
            .eq('organization_id', orgId)

        if (error) throw error

        // Group by day
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
        const dailyRevenue = new Array(7).fill(0).map((_, i) => {
            const d = new Date(startDate)
            d.setDate(d.getDate() + i)
            return {
                date: d.toISOString().split('T')[0],
                dayName: days[d.getDay()],
                revenue: 0
            }
        })

        jobs.forEach(job => {
            const jobDate = job.start_time.split('T')[0]
            const dayEntry = dailyRevenue.find(d => d.date === jobDate)
            if (dayEntry) {
                dayEntry.revenue += (job.cleaning_services?.base_price || 0)
            }
        })
        return dailyRevenue
    } catch (error) {
        console.error('Error fetching revenue:', error)
        return []
    }
}
