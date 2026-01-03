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
export async function createWorkOrder(data: {
    clientId: string
    serviceId: string
    staffId?: string
    startTime: string // ISO string
    address?: string
    notes?: string
    vertical?: string // Optional override
    title?: string // Optional override
}) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) return { success: false, error: "Unauthorized" }

        // 1. Fetch Service details (Duration, Name, etc.)
        const { data: service } = await supabase
            .from('service_catalog')
            .select('*')
            .eq('id', data.serviceId)
            .single()

        if (!service) return { success: false, error: "Service not found" }

        // 2. Calculate End Time
        // Metadata structure validation is important here. We assume strict typing in future but relaxed now.
        const duration = service.metadata?.duration_minutes || 60
        const startDate = new Date(data.startTime)
        const endDate = addMinutes(startDate, duration)

        // 3. Determine Vertical
        let vertical = data.vertical || 'generic'
        if (!data.vertical) {
            // Fallback: Check active app for this org
            // Simplification: We assume the service's category implies context, or we just default to 'generic'
            // Ideally we query saas_apps join, but for now let's rely on what the UI sends or service category
            if (service.category === 'cleaning') vertical = 'cleaning'
            else if (service.category === 'maintenance') vertical = 'maintenance'
        }

        const payload = {
            organization_id: orgId,
            client_id: data.clientId,
            service_id: data.serviceId,
            assigned_staff_id: data.staffId || null,
            title: data.title || service.name,
            description: data.notes || '',
            start_time: data.startTime,
            end_time: endDate.toISOString(),
            status: 'scheduled',
            vertical: vertical,
            location_type: 'at_client_address',
            location_address: data.address || '',
            metadata: {
                source: 'admin_panel',
                service_snapshot: {
                    name: service.name,
                    price: service.base_price
                }
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
