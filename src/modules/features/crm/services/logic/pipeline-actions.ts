'use server'

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"
import { PipelineService } from "./services/pipeline.service"

const PUBLIC_PIPELINE_ERROR = "No se pudo completar la accion de pipeline"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizePipelineError(error: unknown) {
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

function logPipelineError(label: string, error: unknown) {
    console.error(label, isDeployedRuntime() ? summarizePipelineError(error) : error)
}

function pipelineActionFailure<T>(label: string, error: unknown): ActionResponse<T> {
    logPipelineError(label, error)
    if (isDeployedRuntime()) return { success: false, error: PUBLIC_PIPELINE_ERROR }
    if (error instanceof Error) return { success: false, error: error.message }
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return { success: false, error: error.message }
    }
    return { success: false, error: PUBLIC_PIPELINE_ERROR }
}

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
        logPipelineError("Error fetching pipeline stages:", error)
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
        return pipelineActionFailure<PipelineStage>("Error creating pipeline stage:", error)
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
        return pipelineActionFailure<PipelineStage>("Error updating pipeline stage:", error)
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
        return pipelineActionFailure<null>("Error deleting pipeline stage:", error)
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
        return pipelineActionFailure<null>("Error reordering pipeline stages:", error)
    }
}

export async function getDefaultPipeline() {
    try {
        const service = await getService()
        return await service.getDefaultPipeline()
    } catch (error: any) {
        logPipelineError("Error fetching pipeline:", error)
        return null
    }
}

export async function togglePipelineStrictMode(pipelineId: string, enabled: boolean) {
    try {
        const service = await getService()
        const data = await service.toggleStrictMode(pipelineId, enabled)
        return { success: true, data }
    } catch (error: any) {
        return pipelineActionFailure<Pipeline>("Error toggling strict mode:", error)
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
        logPipelineError("Error fetching pipeline data:", error)
        return null
    }
}

