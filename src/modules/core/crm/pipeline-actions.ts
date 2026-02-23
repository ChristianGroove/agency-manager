"use server"

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"

export type PipelineStage = {
    id: string
    organization_id: string
    name: string
    status_key: string
    display_order: number
    color: string
    icon: string
    is_active: boolean
    is_final: boolean
}

export type ActionResponse<T> = {
    success: boolean
    data?: T
    error?: string
}

export async function getPipelineStages(): Promise<PipelineStage[]> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    try {
        const { data, error } = await supabase
            .from('pipeline_stages')
            .select('*')
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .order('display_order', { ascending: true })

        if (error) throw error

        // DEBUG: Check stages
        console.log("🛤️ Pipeline Stages for Org:", orgId, data?.map(s => `${s.name} (${s.status_key})`))
        return data as PipelineStage[]
    } catch (error: any) {
        console.error("Error fetching pipeline stages:", error)
        return []
    }
}

export async function createPipelineStage(input: {
    name: string
    status_key: string
    color?: string
    icon?: string
    display_order?: number
}): Promise<ActionResponse<PipelineStage>> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "No organization context" }

    try {
        // Find default pipeline if not provided
        const { data: pipeline } = await supabase
            .from('pipelines')
            .select('id')
            .eq('organization_id', orgId)
            .eq('is_default', true)
            .single()

        const { data, error } = await supabase
            .from('pipeline_stages')
            .insert({
                organization_id: orgId,
                pipeline_id: pipeline?.id,
                name: input.name,
                status_key: input.status_key,
                color: input.color || 'bg-gray-500',
                icon: input.icon || 'circle',
                display_order: input.display_order || 999,
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/crm')
        revalidatePath('/crm/pipeline')
        revalidatePath('/crm/settings/pipeline')

        return { success: true, data: data as PipelineStage }
    } catch (error: any) {
        console.error("Error creating pipeline stage:", error)
        return { success: false, error: error.message }
    }
}

export async function updatePipelineStage(
    stageId: string,
    updates: Partial<Pick<PipelineStage, 'name' | 'color' | 'icon' | 'display_order'>>
): Promise<ActionResponse<PipelineStage>> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "No organization context" }

    try {
        const { data, error } = await supabase
            .from('pipeline_stages')
            .update(updates)
            .eq('id', stageId)
            .eq('organization_id', orgId)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/crm')
        revalidatePath('/crm/pipeline')
        revalidatePath('/crm/settings/pipeline')

        return { success: true, data: data as PipelineStage }
    } catch (error: any) {
        console.error("Error updating pipeline stage:", error)
        return { success: false, error: error.message }
    }
}

export async function deletePipelineStage(stageId: string): Promise<ActionResponse<null>> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "No organization context" }

    try {
        // Soft delete by setting is_active to false
        const { error } = await supabase
            .from('pipeline_stages')
            .update({ is_active: false })
            .eq('id', stageId)
            .eq('organization_id', orgId)

        if (error) throw error

        revalidatePath('/crm')
        revalidatePath('/crm/pipeline')
        revalidatePath('/crm/settings/pipeline')

        return { success: true }
    } catch (error: any) {
        console.error("Error deleting pipeline stage:", error)
        return { success: false, error: error.message }
    }
}

export async function reorderPipelineStages(
    stageIds: string[]
): Promise<ActionResponse<null>> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "No organization context" }

    try {
        // Update each stage with its new display_order
        const updates = stageIds.map((stageId, index) =>
            supabase
                .from('pipeline_stages')
                .update({ display_order: index + 1 })
                .eq('id', stageId)
                .eq('organization_id', orgId)
        )

        await Promise.all(updates)

        revalidatePath('/crm')
        revalidatePath('/crm/pipeline')
        revalidatePath('/crm/settings/pipeline')

        return { success: true }
    } catch (error: any) {
        console.error("Error reordering pipeline stages:", error)
        return { success: false, error: error.message }
    }
}

// --- Pipeline Entity Actions (Phase 8) ---

export type Pipeline = {
    id: string
    organization_id: string
    name: string
    is_default: boolean
    process_enabled: boolean
}

/**
 * Get the default pipeline for the organization
 * (For MVP we assume 1 pipeline per org)
 */
export async function getDefaultPipeline(): Promise<Pipeline | null> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return null

    try {
        const { data, error } = await supabase
            .from('pipelines')
            .select('*')
            .eq('organization_id', orgId)
            .eq('is_default', true)
            .maybeSingle()

        if (error) throw error
        return data as Pipeline
    } catch (error: any) {
        console.error("Error fetching pipeline:", error)
        return null
    }
}

export async function togglePipelineStrictMode(pipelineId: string, enabled: boolean): Promise<ActionResponse<Pipeline>> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    try {
        const { data, error } = await supabase
            .from('pipelines')
            .update({ process_enabled: enabled })
            .eq('id', pipelineId)
            .eq('organization_id', orgId)
            .select()
            .single()

        if (error) throw error
        return { success: true, data: data as Pipeline }
    } catch (error: any) {
        console.error("Error toggling strict mode:", error)
        return { success: false, error: error.message }
    }
}

// --- Optimized Data Fetching (Phase 9) ---
import { unstable_cache } from "next/cache"
import { Lead, Emitter } from "@/types"
import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * Cached version of getPipelineStages (1 hour TTL)
 * Stages rarely change.
 */
async function fetchPipelineStages(orgId: string) {
    // Use Admin Client to bypass cookies() requirement in cache scope
    const { data, error } = await supabaseAdmin
        .from('pipeline_stages')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

    if (error) return []
    return data as PipelineStage[]
}

/**
 * Cached version of getPipelineStages (1 hour TTL)
 * Stages rarely change.
 */
export async function getCachedPipelineStages(orgId: string) {
    return unstable_cache(
        async () => fetchPipelineStages(orgId),
        ['pipeline-stages', orgId],
        { revalidate: 3600 }
    )()
}

/**
 * Aggregated server action to fetch all CRM data in parallel.
 * Reduces 4+ roundtrips to 1.
 */
export async function getPipelineData() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return null

    // Parallel Fetching
    const { getLeads } = await import('./leads-actions')
    const { getEmitters } = await import('@/modules/core/settings/emitters-actions')
    const { getLeadsCount } = await import('./lead-management-actions')

    const [stages, leads, emitters, totalCount] = await Promise.all([
        getCachedPipelineStages(orgId),
        getLeads(300), // Existing limit
        getEmitters(),
        getLeadsCount()
    ])

    return {
        stages,
        leads,
        emitters: emitters || [],
        totalCount
    }
}
