"use server"

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

export type SavedReply = {
    id: string
    title: string
    content: string
    category: string
    tags: string[]
    usage_count: number
    created_at: string
    icon?: string
    is_favorite?: boolean
}

export async function getSavedReplies() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('saved_replies')
        .select('*')
        .order('is_favorite', { ascending: false }) // Favorites first
        .order('usage_count', { ascending: false }) // Most used first
        .order('title', { ascending: true })

    if (error) {
        console.error('[TemplateActions] Failed to fetch:', error)
        return []
    }

    return data as SavedReply[]
}

export async function createSavedReply(reply: Partial<SavedReply>) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('saved_replies')
        .insert({
            title: reply.title,
            content: reply.content,
            category: reply.category || 'General',
            tags: reply.tags || [],
            icon: reply.icon,
            is_favorite: reply.is_favorite || false,
            organization_id: 'db9d1288-80ab-48df-b130-a0739881c6f2' // Hardcoded for simplified dev
        })

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/inbox')
    return { success: true }
}

export async function updateSavedReply(id: string, updates: Partial<SavedReply>) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('saved_replies')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/inbox')
    return { success: true }
}

export async function deleteSavedReply(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('saved_replies')
        .delete()
        .eq('id', id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/inbox')
    return { success: true }
}

export async function incrementUsageCount(id: string) {
    const supabase = await createClient()

    // Using rpc or simple increment logic if strict atomic not needed for this scale
    // For now, simple fetch + update (or raw sql if we had rpc)
    // Let's rely on simple update for now

    // Actually best way without RPC for increment is:
    // This is race-condition prone but fine for MVP "usage stats"
    const { data } = await supabase.from('saved_replies').select('usage_count').eq('id', id).single()

    if (data) {
        await supabase
            .from('saved_replies')
            .update({ usage_count: (data.usage_count || 0) + 1 })
            .eq('id', id)
    }
}
