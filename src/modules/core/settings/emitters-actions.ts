"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { Emitter } from "@/types/billing"

const PUBLIC_EMITTER_CREATE_ERROR = "No se pudo crear el emisor"
const PUBLIC_EMITTER_UPDATE_ERROR = "No se pudo actualizar el emisor"
const PUBLIC_EMITTER_DELETE_ERROR = "No se pudo eliminar el emisor"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeEmitterActionError(error: unknown) {
    if (error instanceof Error) return { name: error.name }

    if (error && typeof error === 'object') {
        return {
            code: (error as any).code,
            status: (error as any).status,
            statusCode: (error as any).statusCode,
            hasMessage: typeof (error as any).message === 'string' && (error as any).message.length > 0,
        }
    }

    return { type: typeof error }
}

function logEmitterActionError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizeEmitterActionError(error))
}

function emitterActionErrorMessage(error: unknown, publicMessage: string) {
    if (isDeployedRuntime()) return publicMessage
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
        return error.message
    }
    return publicMessage
}

function logEmitterContext(orgId: string | null | undefined) {
    if (!isDeployedRuntime()) {
        console.log("DEBUG: getEmitters called. Context OrgId:", orgId)
        return
    }

    console.log("DEBUG: getEmitters called.", { organizationIdPresent: Boolean(orgId) })
}

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
    logEmitterContext(orgId)

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
        logEmitterActionError("Error creating emitter:", error)
        return { error: emitterActionErrorMessage(error, PUBLIC_EMITTER_CREATE_ERROR) }
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
        logEmitterActionError("Error updating emitter:", error)
        return { error: emitterActionErrorMessage(error, PUBLIC_EMITTER_UPDATE_ERROR) }
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

    if (error) {
        logEmitterActionError("Error deleting emitter:", error)
        throw new Error(emitterActionErrorMessage(error, PUBLIC_EMITTER_DELETE_ERROR))
    }
    return { success: true }
}

