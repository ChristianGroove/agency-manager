'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

export async function getOperationsMetrics() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return null

    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    try {
        // Get today's appointments
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select('id, status, service_id')
            .eq('organization_id', orgId)
            .eq('service_vertical', 'cleaning')
            .gte('start_time', today.toISOString())
            .lt('start_time', tomorrow.toISOString())

        if (error) throw error

        const jobs = appointments || []

        // Calculate metrics
        const metrics = {
            total: jobs.length,
            inProgress: jobs.filter(j => j.status === 'in_progress').length,
            completed: jobs.filter(j => j.status === 'completed').length,
            pending: jobs.filter(j => j.status === 'assigned' || j.status === 'pending').length,
            cancelled: jobs.filter(j => j.status === 'cancelled').length
        }

        return metrics
    } catch (error) {
        console.error('Error fetching operations metrics:', error)
        return null
    }
}
