"use server"

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { Emitter } from "@/types/billing"

export async function getActiveEmitters() {
    const supabase = await createClient()
    // Relaxed filter: Rely on RLS to show all emitters accessable by user
    // This matches the behavior in the Quotes module

    const { data, error } = await supabase
        .from('emitters')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching emitters:", error)
        return []
    }

    return data as Emitter[]
}

export async function getEmitters() {
    const supabase = await createClient()

    // Debug logging kept for traceability
    const orgId = await getCurrentOrganizationId()
    console.log("DEBUG: getEmitters called. Context OrgId:", orgId)

    // Relaxed filter: Rely on RLS to show all emitters accessable by user
    // even if they don't match the current specific organization context cookie.
    const { data, error } = await supabase
        .from('emitters')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching all emitters:", error)
        return []
    }

    console.log(`DEBUG: Found ${data?.length} emitters (RLS filtered)`)
    return data as Emitter[]
}

export async function createEmitter(data: Partial<Emitter>) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { error: "No organization selected" }

    const { data: result, error } = await supabase
        .from('emitters')
        .insert({
            ...data,
            organization_id: orgId
        })
        .select()
        .single()

    if (error) {
        console.error("Error creating emitter:", error)
        return { error: error.message }
    }
    return { data: result as Emitter }
}

export async function updateEmitter(id: string, data: Partial<Emitter>) {
    const supabase = await createClient()

    const { data: result, error } = await supabase
        .from('emitters')
        .update(data)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error("Error updating emitter:", error)
        return { error: error.message }
    }
    return { data: result as Emitter }
}

export async function deleteEmitter(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('emitters')
        .delete()
        .eq('id', id)

    if (error) throw error
    return { success: true }
}
