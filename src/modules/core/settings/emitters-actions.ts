"use server"

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { Emitter } from "@/types/billing"

export async function getActiveEmitters() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    const { data, error } = await supabase
        .from('emitters')
        .select('*')
        .eq('is_active', true)
        .eq('organization_id', orgId) // Strict filtering
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

    // Strict filtering: Do NOT rely solely on RLS
    const { data, error } = await supabase
        .from('emitters')
        .select('*')
        .eq('organization_id', orgId) // Strict filtering
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
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error("No organization context")

    const { data: result, error } = await supabase
        .from('emitters')
        .update(data)
        .eq('id', id)
        .eq('organization_id', orgId)
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
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error("No organization context")

    const { error } = await supabase
        .from('emitters')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) throw error
    return { success: true }
}
