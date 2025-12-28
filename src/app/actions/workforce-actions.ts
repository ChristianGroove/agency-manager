'use server'

import { createClient } from "@/lib/supabase-server"
import { StaffProfile, UpdateStaffProfileDTO, CreateStaffProfileDTO } from "@/types/workforce"
import { revalidatePath } from "next/cache"

/**
 * Fetches all staff profiles for an organization, joining with member details
 */
export async function getStaffProfiles(organizationId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('staff_profiles')
        .select(`
            *,
            member:organization_members!member_id(
                id,
                full_name,
                email,
                avatar_url
            )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching staff profiles:', error)
        throw new Error('Failed to fetch staff profiles')
    }

    return data as StaffProfile[]
}

/**
 * Updates a staff profile's rate, skills, or color
 */
export async function updateStaffProfile(profileId: string, data: UpdateStaffProfileDTO) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('staff_profiles')
        .update(data)
        .eq('id', profileId)

    if (error) {
        console.error('Error updating staff profile:', error)
        return { error: 'Error actualizando perfil' }
    }

    revalidatePath('/workforce') // Adjust path as needed
    return { success: true }
}

/**
 * Creates a new staff profile for an existing organization member
 */
export async function createStaffProfile(organizationId: string, data: CreateStaffProfileDTO) {
    const supabase = await createClient()

    // Ensure member belongs to org (RLS handles this but good to have explicit check or try/catch)
    const { error } = await supabase
        .from('staff_profiles')
        .insert({
            organization_id: organizationId,
            ...data
        })

    if (error) {
        if (error.code === '23505') { // Unique constraint violation
            return { error: 'Este miembro ya es parte del staff' }
        }
        console.error('Error creating staff profile:', error)
        return { error: 'Error creando perfil de staff' }
    }

    revalidatePath('/workforce')
    return { success: true }
}

/**
 * Get members who are NOT yet staff
 */
export async function getPotentialStaff(organizationId: string) {
    const supabase = await createClient()

    // 1. Get all members
    const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('id, full_name, email, avatar_url, user_id')
        .eq('organization_id', organizationId)

    if (membersError) throw new Error(membersError.message)

    // 2. Get existing staff user_ids
    const { data: staff, error: staffError } = await supabase
        .from('staff_profiles')
        .select('member_id')
        .eq('organization_id', organizationId)

    if (staffError) throw new Error(staffError.message)

    const staffMemberIds = new Set(staff.map((s: { member_id: string }) => s.member_id))

    // 3. Filter
    return members.filter((m: { id: string }) => !staffMemberIds.has(m.id))
}
