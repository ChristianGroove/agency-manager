"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"

const PUBLIC_CATEGORY_ERROR = "No se pudo completar la accion de categorias"

function isDeployedRuntime() {
    return process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test" || !!process.env.VERCEL_ENV
}

function summarizeCategoryError(error: unknown) {
    if (error instanceof Error) return { name: error.name }

    if (error && typeof error === "object") {
        return {
            code: (error as any).code,
            status: (error as any).status,
            statusCode: (error as any).statusCode,
            hasMessage: typeof (error as any).message === "string" && (error as any).message.length > 0,
        }
    }

    return { type: typeof error }
}

function categoryActionFailure(label: string, error: unknown): { success: false; error: string } {
    if (isDeployedRuntime()) {
        console.error(label, summarizeCategoryError(error))
        return { success: false, error: PUBLIC_CATEGORY_ERROR }
    }

    console.error(label, error)
    if (error instanceof Error) return { success: false, error: error.message }
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
        return { success: false, error: error.message }
    }
    return { success: false, error: PUBLIC_CATEGORY_ERROR }
}

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
        return categoryActionFailure("Error fetching client categories:", error)
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
        return categoryActionFailure("Error creating client category:", error)
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
        return categoryActionFailure("Error updating client category:", error)
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
        return categoryActionFailure("Error deleting client category:", error)
    }
}

