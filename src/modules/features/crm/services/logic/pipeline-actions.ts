'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"
import { PipelineService } from "./services/pipeline.service"

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

export type Pipeline = {
    id: string
    organization_id: string
    name: string
    is_default: boolean
    process_enabled: boolean
}

export type ActionResponse<T> = {
    success: boolean
    data?: T
    error?: string
}

async function getService() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No organization context")
    return new PipelineService(supabase, orgId)
}

export async function getPipelineStages(): Promise<PipelineStage[]> {
    try {
        const service = await getService()
        return await service.getStages() as PipelineStage[]
    } catch (error) {
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
    try {
        const service = await getService()
        const data = await service.createStage(input)
        
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
    try {
        const service = await getService()
        const data = await service.updateStage(stageId, updates)

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
    try {
        const service = await getService()
        
        if (stageId) {
            await service.deleteStage(stageId)
        }

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
    try {
        const service = await getService()
        await service.reorderStages(stageIds)

        revalidatePath('/crm')
        revalidatePath('/crm/pipeline')
        revalidatePath('/crm/settings/pipeline')

        return { success: true }
    } catch (error: any) {
        console.error("Error reordering pipeline stages:", error)
        return { success: false, error: error.message }
    }
}

export async function getDefaultPipeline() {
    try {
        const service = await getService()
        return await service.getDefaultPipeline()
    } catch (error: any) {
        console.error("Error fetching pipeline:", error)
        return null
    }
}

export async function togglePipelineStrictMode(pipelineId: string, enabled: boolean) {
    try {
        const service = await getService()
        const data = await service.toggleStrictMode(pipelineId, enabled)
        return { success: true, data }
    } catch (error: any) {
        console.error("Error toggling strict mode:", error)
        return { success: false, error: error.message }
    }
}

export async function getCachedPipelineStages(orgId: string) {
    const service = await getService()
    return await service.getCachedStages()
}

export async function getPipelineData(connectionId?: string | null) {
    try {
        const service = await getService()
        return await service.getPipelineViewData(connectionId)
    } catch (error) {
        console.error("Error fetching pipeline data:", error)
        return null
    }
}
