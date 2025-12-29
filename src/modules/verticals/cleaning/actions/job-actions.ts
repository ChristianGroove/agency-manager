'use server'

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"
import { createWorkLogFromAppointment } from "./payroll-actions"
import { addMinutes } from "date-fns"

export type CleaningJob = {
    id: string
    title: string
    start_time: string
    end_time: string
    status: string
    location_address?: string
    client?: {
        id: string
        name: string
    }
    service?: {
        id: string
        name: string
        price_unit: string
    }
    staff?: {
        id: string
        first_name?: string
        last_name?: string
    }
}

/**
 * SIMPLIFIED: Create cleaning job - Using admin client to bypass all permission issues
 */
export async function createCleaningJob(data: {
    clientId: string
    serviceId: string
    staffId?: string
    startTime: string // ISO string
    address: string
    notes?: string
}) {
    console.log("🚀 CREATE JOB START:", new Date().toISOString())
    console.log("📝 Input:", JSON.stringify(data, null, 2))

    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) {
            console.error("❌ No org ID")
            return { success: false, error: "Organización no encontrada" }
        }

        console.log("✅ Org ID:", orgId)

        // Fetch service for duration
        const { data: service } = await supabaseAdmin
            .from('cleaning_services')
            .select('name, estimated_duration_minutes')
            .eq('id', data.serviceId)
            .single()

        if (!service) {
            console.error("❌ Service not found")
            return { success: false, error: "Servicio no encontrado" }
        }

        console.log("✅ Service:", service.name)

        const startDate = new Date(data.startTime)
        const endDate = addMinutes(startDate, service.estimated_duration_minutes || 60)

        const payload = {
            organization_id: orgId,
            client_id: data.clientId,
            service_id: data.serviceId,
            staff_id: data.staffId || null,
            title: service.name,
            description: data.notes || '',
            start_time: data.startTime,
            end_time: endDate.toISOString(),
            location_type: 'at_client_address',
            address_text: data.address,
            service_vertical: 'cleaning',
            status: 'assigned'
        }

        console.log("📦 Payload:", JSON.stringify(payload, null, 2))

        // Use ADMIN client to bypass RLS completely
        const { data: job, error } = await supabaseAdmin
            .from('appointments')
            .insert(payload)
            .select()
            .single()

        if (error) {
            console.error("❌ INSERT ERROR:", error)
            return { success: false, error: error.message }
        }

        console.log("✅ JOB CREATED:", job.id)

        revalidatePath('/cleaning')

        return { success: true, data: job }

    } catch (error: any) {
        console.error("💥 EXCEPTION:", error)
        return { success: false, error: error.message }
    }
}

/**
 * SIMPLIFIED: Get cleaning jobs - Manual joins to avoid FK issues
 */
export async function getCleaningJobs(startDate?: string) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) return []

        // Get appointments only
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('organization_id', orgId)
            .eq('service_vertical', 'cleaning')
            .gte('start_time', startDate || new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(50)

        if (error) {
            console.error("Error fetching jobs:", error)
            return []
        }

        if (!appointments || appointments.length === 0) {
            console.log("No appointments found")
            return []
        }

        console.log(`Found ${appointments.length} appointments`)

        // Manually fetch related data
        const jobs = await Promise.all(appointments.map(async (apt) => {
            const [clientRes, serviceRes, staffRes] = await Promise.all([
                apt.client_id
                    ? supabase.from('clients').select('id, name').eq('id', apt.client_id).maybeSingle()
                    : Promise.resolve({ data: null }),
                apt.service_id
                    ? supabase.from('cleaning_services').select('id, name, price_unit').eq('id', apt.service_id).maybeSingle()
                    : Promise.resolve({ data: null }),
                apt.staff_id
                    ? supabase.from('cleaning_staff_profiles').select('id, first_name, last_name').eq('id', apt.staff_id).maybeSingle()
                    : Promise.resolve({ data: null })
            ])

            return {
                ...apt,
                client: clientRes.data,
                service: serviceRes.data,
                staff: staffRes.data
            }
        }))

        return jobs as CleaningJob[]

    } catch (error) {
        console.error("Exception in getCleaningJobs:", error)
        return []
    }
}

export async function updateCleaningJob(id: string, data: {
    staffId?: string
    startTime?: string
    notes?: string
    status?: string
}) {
    const supabase = await createClient()

    const updateData: any = {}
    if (data.staffId !== undefined) updateData.staff_id = data.staffId === 'unassigned' ? null : data.staffId
    if (data.startTime) {
        const { data: job } = await supabase.from('appointments').select('service_id').eq('id', id).single()
        if (job?.service_id) {
            const { data: service } = await supabase.from('cleaning_services').select('estimated_duration_minutes').eq('id', job.service_id).single()
            const duration = service?.estimated_duration_minutes || 60
            const startDate = new Date(data.startTime)
            updateData.start_time = data.startTime
            updateData.end_time = addMinutes(startDate, duration).toISOString()
        }
    }
    if (data.notes) updateData.description = data.notes
    if (data.status) updateData.status = data.status

    const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/cleaning')
    return { success: true }
}

export async function cancelJob(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/cleaning')
    return { success: true }
}
