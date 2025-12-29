"use server"

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

const STAFF_PATH = "/cleaning/staff"

import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

// ... imports

export async function getCleaningStaff() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    // Select profiles
    // We now have first_name, last_name, email directly on the profile
    const { data: staff, error } = await supabase
        .from("cleaning_staff_profiles")
        .select(`
            *
        `)
        .eq("organization_id", orgId)
        .is('deleted_at', null)
        .order('first_name')

    if (error) {
        console.error("Error fetching staff:", error)
        return []
    }

    // Map to a consistent format for UI
    return staff.map(s => ({
        id: s.id,
        member_id: s.member_id, // Might be null now
        role: s.role || 'cleaner',
        hourly_rate: s.hourly_rate,
        skills: s.skills,
        // Allow fallback to legacy member linkage if name is missing (backward compatibility)
        name: (s.first_name && s.last_name) ? `${s.first_name} ${s.last_name}` : (s.first_name || 'Sin Nombre'),
        email: s.email,
        phone: s.phone,
        avatar_url: s.avatar_url,
        access_token: s.access_token
    }))
}

// ... getAvailableMembers (keep as is) ...

export async function registerCleaningStaff(data: any) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "No organization found" }

    const { error } = await supabase.from("cleaning_staff_profiles").insert({
        organization_id: orgId,
        // member_id: data.memberId, // No longer linking strict members
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        hourly_rate: data.hourly_rate,
        skills: data.skills,
        status: 'active'
    })

    if (error) {
        console.error(error)
        return { success: false, error: error.message }
    }

    revalidatePath(STAFF_PATH)
    return { success: true }
}

export async function updateStaffProfile(id: string, data: any) {
    const supabase = await createClient()

    // We update the direct fields now
    const { error } = await supabase
        .from("cleaning_staff_profiles")
        .update({
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            phone: data.phone,
            role: data.role,
            hourly_rate: data.hourly_rate,
            skills: data.skills
        })
        .eq("id", id)

    if (error) return { success: false, error: error.message }

    revalidatePath(STAFF_PATH)
    return { success: true }
}

export async function removeCleaningStaff(id: string) {
    const supabase = await createClient()

    // Soft delete
    const { error } = await supabase
        .from("cleaning_staff_profiles")
        .update({ deleted_at: new Date().toISOString(), status: 'inactive' })
        .eq("id", id)

    if (error) return { success: false, error: error.message }

    revalidatePath(STAFF_PATH)
    return { success: true }
}

/**
 * Get shareable portal link for a staff member
 */
export async function getStaffPortalLink(staffId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        return { success: false, error: "Organización no encontrada" }
    }

    const { data: staff, error } = await supabase
        .from('cleaning_staff_profiles')
        .select('access_token, first_name, last_name')
        .eq('id', staffId)
        .eq('organization_id', orgId)
        .single()

    if (error || !staff) {
        return { success: false, error: "Personal no encontrado" }
    }

    // If no access_token, generate one
    if (!staff.access_token) {
        const newToken = crypto.randomUUID()
        const { error: updateError } = await supabase
            .from('cleaning_staff_profiles')
            .update({ access_token: newToken })
            .eq('id', staffId)

        if (updateError) {
            return { success: false, error: "Error generando token de acceso" }
        }

        staff.access_token = newToken
    }

    // Build full URL
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL

    if (!baseUrl) {
        try {
            const headersList = await headers()
            const host = headersList.get("host")
            const protocol = host?.includes("localhost") ? "http" : "https"
            baseUrl = `${protocol}://${host}`
        } catch (e) {
            baseUrl = "http://localhost:3000"
        }
    }

    const link = `${baseUrl}/portal/${staff.access_token}`

    return {
        success: true,
        link,
        name: `${staff.first_name} ${staff.last_name}`
    }
}

export async function regenerateStaffPortalToken(staffId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Organización no encontrada" }

    const newToken = crypto.randomUUID()

    const { error } = await supabase
        .from('cleaning_staff_profiles')
        .update({ access_token: newToken })
        .eq('id', staffId)
        .eq('organization_id', orgId)

    if (error) {
        console.error("Error regenerating token:", error)
        return { success: false, error: "Error al regenerar token" }
    }

    revalidatePath(STAFF_PATH)
    return { success: true }
}
