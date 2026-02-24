"use server"

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

export async function uploadSticker(formData: FormData): Promise<{ url: string | null, error: string | null }> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { url: null, error: "No organization found" }

    const file = formData.get("file") as File
    if (!file) return { url: null, error: "No file provided" }

    const supabase = await createClient()
    const fileName = `stickers/${orgId}/${Math.random().toString(36).substring(2)}.webp`

    const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file, { contentType: 'image/webp', upsert: true })

    if (uploadError) return { url: null, error: uploadError.message }

    const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName)

    return { url: publicUrl, error: null }
}

export async function getStickersGallery(): Promise<{ urls: string[], error: string | null }> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { urls: [], error: "No organization found" }

    const supabase = await createClient()
    const { data, error } = await supabase.storage
        .from('chat-attachments')
        .list(`stickers/${orgId}`)

    if (error) return { urls: [], error: error.message }

    // Sort by created_at descending if available, and map to URL
    const sortedData = data
        .filter(f => f.name.endsWith('.webp'))
        // list() objects usually return created_at, sort them descending
        .sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
            return dateB - dateA
        })

    const urls = sortedData.map(f => {
        const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(`stickers/${orgId}/${f.name}`)
        return publicUrl
    })

    return { urls, error: null }
}

export async function deleteSticker(url: string): Promise<{ success: boolean, error: string | null }> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No organization found" }

    const supabase = await createClient()
    const parts = url.split('/')
    const filename = parts[parts.length - 1]

    const { error } = await supabase.storage
        .from('chat-attachments')
        .remove([`stickers/${orgId}/${filename}`])

    if (error) return { success: false, error: error.message }
    return { success: true, error: null }
}
