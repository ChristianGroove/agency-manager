"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"

export type ClientCategory = {
    id: string
    organization_id: string
    name: string
    color: string
    created_at: string
    updated_at: string
}

export async function getClientCategories() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    try {
        const { data, error } = await supabase
            .from("client_categories")
            .select("*")
            .eq("organization_id", orgId)
            .order("name", { ascending: true })

        if (error) throw error

        return { success: true, data: data as ClientCategory[] }
    } catch (error: any) {
        console.error("Error fetching client categories:", error)
        return { success: false, error: error.message }
    }
}

export async function createClientCategory(name: string, color: string = 'slate') {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    try {
        const { data, error } = await supabase
            .from("client_categories")
            .insert({
                organization_id: orgId,
                name: name.trim(),
                color
            })
            .select()
            .single()

        if (error) {
            // Handle unique constraint violation gracefully
            if (error.code === '23505') {
                return { success: false, error: "Ya existe una categoría con este nombre." }
            }
            throw error
        }

        revalidatePath("/dashboard/clients")
        return { success: true, data: data as ClientCategory }
    } catch (error: any) {
        console.error("Error creating client category:", error)
        return { success: false, error: error.message }
    }
}

export async function updateClientCategory(id: string, name: string, color: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    try {
        const { data, error } = await supabase
            .from("client_categories")
            .update({
                name: name.trim(),
                color,
                updated_at: new Date().toISOString()
            })
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                return { success: false, error: "Ya existe otra categoría con este nombre." }
            }
            throw error
        }

        revalidatePath("/dashboard/clients")
        return { success: true, data: data as ClientCategory }
    } catch (error: any) {
        console.error("Error updating client category:", error)
        return { success: false, error: error.message }
    }
}

export async function deleteClientCategory(id: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    try {
        const { error } = await supabase
            .from("client_categories")
            .delete()
            .eq("id", id)
            .eq("organization_id", orgId)

        if (error) throw error

        revalidatePath("/dashboard/clients")
        return { success: true }
    } catch (error: any) {
        console.error("Error deleting client category:", error)
        return { success: false, error: error.message }
    }
}

