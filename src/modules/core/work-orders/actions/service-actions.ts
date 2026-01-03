'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"

export interface CleaningService {
    id: string
    organization_id: string
    name: string
    description?: string
    base_price: number
    price_unit: string // 'hour', 'sqm', 'flat'
    estimated_duration_minutes: number
    is_active: boolean
    created_at: string
}

export async function getCleaningServices() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('cleaning_services')
        .select('*')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching cleaning services:", error)
        return []
    }

    return data
}

export async function createCleaningService(data: any) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Organization not found" }

    const { error } = await supabase
        .from('cleaning_services')
        .insert({
            ...data,
            organization_id: orgId
        })

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/cleaning')
    return { success: true }
}

export async function updateCleaningService(id: string, data: any) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    const { error } = await supabase
        .from('cleaning_services')
        .update(data)
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/cleaning')
    return { success: true }
}

export async function deleteCleaningService(id: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    const { error } = await supabase
        .from('cleaning_services')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/cleaning')
    return { success: true }
}
