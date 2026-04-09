"use server"

import { createClient } from "@/lib/supabase-server"
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
        console.error("Error fetching tags:", e)
        return []
    }
}

export async function createTag(name: string, color: string = '#808080'): Promise<ActionResponse<Tag>> {
    try {
        const service = await getService()
        const data = await service.createTag(name, color)
        return { success: true, data: data as Tag }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function updateTag(id: string, updates: { name?: string; color?: string }): Promise<ActionResponse<Tag>> {
    try {
        const service = await getService()
        const data = await service.updateTag(id, updates)
        return { success: true, data: data as Tag }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function deleteTag(id: string): Promise<ActionResponse<void>> {
    try {
        const service = await getService()
        await service.deleteTag(id)
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function getLeadTags(leadId: string): Promise<LeadTag[]> {
    try {
        const service = await getService()
        return await service.getLeadTags(leadId) as LeadTag[]
    } catch (e) {
        console.error("Error fetching lead tags:", e)
        return []
    }
}

export async function toggleLeadTag(leadId: string, tagId: string): Promise<ActionResponse<{ action: 'added' | 'removed' }>> {
    try {
        const service = await getService()
        const data = await service.toggleLeadTag(leadId, tagId)
        return { success: true, data }
    } catch (e: any) {
        return { success: false, error: e.message }
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
        return { success: false, error: e.message }
    }
}

export async function removeLeadTagSystem(leadId: string, tagName: string, organizationId: string): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient()
        const service = new TagsService(supabase, organizationId)
        await service.removeTagByName(leadId, tagName)
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function clearLeadTagsSystem(leadId: string, organizationId: string): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient()
        const service = new TagsService(supabase, organizationId)
        await service.clearLeadTags(leadId)
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

