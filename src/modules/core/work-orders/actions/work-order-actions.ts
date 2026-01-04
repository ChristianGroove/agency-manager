'use server'

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"
import { WorkOrder } from "@/types"
import { addMinutes } from "date-fns"

/**
 * Universal Work Order Creation
 * Supports any vertical by checking the current organization's active app or explicit parameter.
 */
export async function createWorkOrder(data: Partial<WorkOrder>) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) return { success: false, error: "Unauthorized" }

        // 1. Fetch Service details if service_id provided
        let serviceDetails = null
        if (data.service_id) {
            const { data: service } = await supabase
                .from('service_catalog')
                .select('*')
                .eq('id', data.service_id)
                .single()
            serviceDetails = service
        }

        // 2. Prepare Payload
        // Use provided end_time or calculate from service duration
        let endTime = data.end_time
        if (!endTime && data.start_time && serviceDetails) {
            const duration = serviceDetails.metadata?.duration_minutes || 60
            endTime = addMinutes(new Date(data.start_time), duration).toISOString()
        }

        const payload = {
            organization_id: orgId,
            client_id: data.client_id,
            service_id: data.service_id,
            assigned_staff_id: data.assigned_staff_id,
            title: data.title || serviceDetails?.name || 'Nuevo Trabajo',
            description: data.description || '',
            start_time: data.start_time,
            end_time: endTime,
            status: data.status || 'pending',
            priority: data.priority || 'normal',
            vertical: data.vertical || 'generic',
            location_type: data.location_type || 'at_client_address',
            location_address: data.location_address || '',
            metadata: {
                source: 'admin_panel',
                ...data.metadata
            }
        }

        // 4. Insert Work Order
        const { data: workOrder, error } = await supabaseAdmin
            .from('work_orders')
            .insert(payload)
            .select()
            .single()

        if (error) {
            console.error("Error creating work order:", error)
            return { success: false, error: error.message }
        }

        revalidatePath('/operations/work-orders')
        return { success: true, data: workOrder }

    } catch (error: any) {
        console.error("Exception creating work order:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Universal Work Order Fetching
 */
export async function getWorkOrders(params?: {
    startDate?: string,
    endDate?: string,
    vertical?: string
    staffId?: string
}) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) return []

        let query = supabase
            .from('work_orders')
            .select(`
                *,
                client:clients(id, name, address),
                service:service_catalog(id, name, category, metadata),
                assignee:organization_members!assigned_staff_id(user_id, first_name, last_name, email)
            `)
            .eq('organization_id', orgId)
            .order('start_time', { ascending: true })

        if (params?.startDate) query = query.gte('start_time', params.startDate)
        if (params?.endDate) query = query.lte('start_time', params.endDate)
        if (params?.vertical) query = query.eq('vertical', params.vertical)
        if (params?.staffId) query = query.eq('assigned_staff_id', params.staffId)

        const { data, error } = await query

        if (error) {
            console.error("Error fetching work orders:", error)
            return []
        }

        return data as WorkOrder[]

    } catch (error) {
        console.error("Exception fetching work orders:", error)
        return []
    }
}

export async function updateWorkOrder(id: string, data: Partial<WorkOrder>) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    const { error } = await supabase
        .from('work_orders')
        .update(data)
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/operations/work-orders')
    return { success: true }
}

export async function deleteWorkOrder(id: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    const { error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/operations/work-orders')
    return { success: true }
}
