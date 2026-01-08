"use server"

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"

export interface KnowledgeEntry {
    id: string
    question: string
    answer: string
    category: string
    source: 'ai_extracted' | 'manual' | 'file'
    tags?: string[]
    created_at: string
}

export async function getKnowledgeBase(query?: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { error: "Unauthorized" }

    const supabase = await createClient()

    let dbQuery = supabase
        .from('knowledge_base')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

    if (query) {
        dbQuery = dbQuery.or(`question.ilike.%${query}%,answer.ilike.%${query}%`)
    }

    const { data, error } = await dbQuery

    if (error) {
        console.error("Error fetching knowledge base:", error)
        return { error: "Failed to fetch knowledge base" }
    }

    return { data: data as KnowledgeEntry[] }
}

export async function deleteKnowledgeEntry(id: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { error: "Unauthorized" }

    const supabase = await createClient()

    const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) {
        console.error("Error deleting knowledge entry:", error)
        return { error: "Failed to delete entry" }
    }

    revalidatePath('/platform/knowledge')
    return { success: true }
}

export async function upsertKnowledgeEntry(entry: Partial<KnowledgeEntry>) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { error: "Unauthorized" }

    const supabase = await createClient()

    // Clean payload
    const payload: any = {
        organization_id: orgId,
        question: entry.question,
        answer: entry.answer,
        category: entry.category || 'General',
        source: entry.source || 'manual',
        tags: entry.tags || []
    }

    if (entry.id) {
        payload.id = entry.id
    }

    const { data, error } = await supabase
        .from('knowledge_base')
        .upsert(payload)
        .select()
        .single()

    if (error) {
        console.error("Error saving knowledge entry:", error)
        return { error: "Failed to save entry" + error.message }
    }

    revalidatePath('/platform/knowledge')
    return { success: true, data }
}
