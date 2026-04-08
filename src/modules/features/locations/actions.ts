"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

// TIPOS
export interface BusinessDay {
    open: string // HH:mm
    close: string // HH:mm
    is_closed: boolean
}

export interface BusinessHours {
    monday: BusinessDay
    tuesday: BusinessDay
    wednesday: BusinessDay
    thursday: BusinessDay
    friday: BusinessDay
    saturday: BusinessDay
    sunday: BusinessDay
}

export interface Location {
    id: string
    organization_id: string
    name: string
    address: string | null
    country: string | null
    state: string | null
    city: string | null
    timezone: string
    latitude: number | string | null
    longitude: number | string | null
    geofence_radius_meters: number
    manager_id: string | null
    business_hours: BusinessHours
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface StaffTracker {
    staff_id: string
    staff_name: string
    latitude: number
    longitude: number
    timestamp: string
    type: string
}

// ==========================================
// ACCIONES
// ==========================================

/**
 * Obtiene todas las sedes de la organización actual
 */
export async function getLocations() {
    const currentOrgId = await getCurrentOrganizationId()
    if (!currentOrgId) return { success: false, data: [] }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('organization_locations')
        .select('*')
        .eq('organization_id', currentOrgId)
        .order('name', { ascending: true })

    if (error) {
        console.error("Error fetching locations:", error)
        return { success: false, data: [] }
    }

    return { success: true, data: data as Location[] }
}

/**
 * Crea una nueva sede
 */
export async function createLocation(payload: Partial<Location>) {
    const currentOrgId = await getCurrentOrganizationId()
    if (!currentOrgId) return { success: false, error: 'Unauthorized' }

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('organization_locations')
        .insert({
            organization_id: currentOrgId,
            name: payload.name,
            address: payload.address || null,
            country: payload.country || 'Colombia',
            state: payload.state || null,
            city: payload.city || null,
            timezone: payload.timezone || 'America/Bogota',
            latitude: payload.latitude || null,
            longitude: payload.longitude || null,
            geofence_radius_meters: payload.geofence_radius_meters || 100,
            business_hours: payload.business_hours,
            is_active: payload.is_active ?? true
        })
        .select()
        .single()

    if (error) {
        console.error("Error creating location:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/platform/locations')
    return { success: true, data }
}

/**
 * Actualiza una sede existente
 */
export async function updateLocation(id: string, payload: Partial<Location>) {
    const currentOrgId = await getCurrentOrganizationId()
    if (!currentOrgId) return { success: false, error: 'Unauthorized' }

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('organization_locations')
        .update({
            ...payload,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('organization_id', currentOrgId) // Security check
        .select()
        .single()

    if (error) {
        console.error("Error updating location:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/platform/locations')
    return { success: true, data }
}

/**
 * Elimina una sede
 */
export async function deleteLocation(id: string) {
    const currentOrgId = await getCurrentOrganizationId()
    if (!currentOrgId) return { success: false, error: 'Unauthorized' }

    const supabase = await createClient()

    const { error } = await supabase
        .from('organization_locations')
        .delete()
        .eq('id', id)
        .eq('organization_id', currentOrgId)

    if (error) {
        console.error("Error deleting location:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/platform/locations')
    return { success: true }
}

/**
 * Obtiene la última posición conocida de cada staff (Trackers)
 */
export async function getStaffTrackers() {
    const currentOrgId = await getCurrentOrganizationId()
    if (!currentOrgId) return { success: false, data: [] }

    const supabase = await createClient()

    // Obtenemos los últimos logs de asistencia que tengan coordenadas
    const { data, error } = await supabase
        .from('attendance_logs')
        .select(`
            staff_id,
            device_lat,
            device_lng,
            timestamp,
            type,
            staff:organization_staff(first_name, last_name)
        `)
        .eq('organization_id', currentOrgId)
        .not('device_lat', 'is', null)
        .order('timestamp', { ascending: false })
        .limit(100)

    if (error) {
        console.error("Error fetching staff trackers:", error)
        return { success: false, data: [] }
    }

    // Filtrar para quedarnos con el último de cada staff
    const latestByStaff = new Map<string, StaffTracker>()

    data?.forEach((log: any) => {
        if (!latestByStaff.has(log.staff_id)) {
            latestByStaff.set(log.staff_id, {
                staff_id: log.staff_id,
                staff_name: `${log.staff?.first_name} ${log.staff?.last_name}`,
                latitude: Number(log.device_lat),
                longitude: Number(log.device_lng),
                timestamp: log.timestamp,
                type: log.type
            })
        }
    })

    return { success: true, data: Array.from(latestByStaff.values()) }
}
