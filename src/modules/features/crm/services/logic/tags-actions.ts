"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { TagsService } from "./services/tags.service"

export type Tag = {
    id: string
    organization_id: string
    name: string
    color: string
    created_at: string
}

export type LeadTag = Tag & {
    linked_at: string
}

export type ActionResponse<T> = {
    success: boolean
    data?: T
    error?: string
}

const PUBLIC_TAG_ACTION_ERROR = "No se pudo completar la accion de etiquetas"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeTagError(error: unknown) {
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

function logTagError(label: string, error: unknown) {
    console.error(label, isDeployedRuntime() ? summarizeTagError(error) : error)
}

function tagActionFailure<T>(label: string, error: unknown): ActionResponse<T> {
    logTagError(label, error)
    if (isDeployedRuntime()) return { success: false, error: PUBLIC_TAG_ACTION_ERROR }
    if (error instanceof Error) return { success: false, error: error.message }
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return { success: false, error: error.message }
    }
    return { success: false, error: PUBLIC_TAG_ACTION_ERROR }
}

async function getService() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Unauthorized")
    return new TagsService(supabase, orgId)
}

// --- USER ACTIONS ---

export async function getTags(): Promise<Tag[]> {
    try {
        const service = await getService()
        return await service.getTags() as Tag[]
    } catch (e) {
        logTagError("Error fetching tags:", e)
        return []
    }
}

export async function createTag(name: string, color: string = '#808080'): Promise<ActionResponse<Tag>> {
    try {
        const service = await getService()
        const data = await service.createTag(name, color)
        return { success: true, data: data as Tag }
    } catch (e: any) {
        return tagActionFailure<Tag>("Error creating tag:", e)
    }
}

export async function updateTag(id: string, updates: { name?: string; color?: string }): Promise<ActionResponse<Tag>> {
    try {
        const service = await getService()
        const data = await service.updateTag(id, updates)
        return { success: true, data: data as Tag }
    } catch (e: any) {
        return tagActionFailure<Tag>("Error updating tag:", e)
    }
}

export async function deleteTag(id: string): Promise<ActionResponse<void>> {
    try {
        const service = await getService()
        await service.deleteTag(id)
        return { success: true }
    } catch (e: any) {
        return tagActionFailure<void>("Error deleting tag:", e)
    }
}

export async function getLeadTags(leadId: string): Promise<LeadTag[]> {
    try {
        const service = await getService()
        return await service.getLeadTags(leadId) as LeadTag[]
    } catch (e) {
        logTagError("Error fetching lead tags:", e)
        return []
    }
}

export async function toggleLeadTag(leadId: string, tagId: string): Promise<ActionResponse<{ action: 'added' | 'removed' }>> {
    try {
        const service = await getService()
        const data = await service.toggleLeadTag(leadId, tagId)
        return { success: true, data }
    } catch (e: any) {
        return tagActionFailure<{ action: 'added' | 'removed' }>("Error toggling lead tag:", e)
    }
}

// --- SYSTEM ACTIONS (Automation) ---

export async function addLeadTagSystem(leadId: string, tagName: string, organizationId: string): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient()
        const service = new TagsService(supabase, organizationId)
        await service.addTagByName(leadId, tagName)
        return { success: true }
    } catch (e: any) {
        return tagActionFailure<void>("Error adding lead tag:", e)
    }
}

export async function removeLeadTagSystem(leadId: string, tagName: string, organizationId: string): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient()
        const service = new TagsService(supabase, organizationId)
        await service.removeTagByName(leadId, tagName)
        return { success: true }
    } catch (e: any) {
        return tagActionFailure<void>("Error removing lead tag:", e)
    }
}

export async function clearLeadTagsSystem(leadId: string, organizationId: string): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient()
        const service = new TagsService(supabase, organizationId)
        await service.clearLeadTags(leadId)
        return { success: true }
    } catch (e: any) {
        return tagActionFailure<void>("Error clearing lead tags:", e)
    }
}

