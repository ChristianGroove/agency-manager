"use server"

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"

export interface MessageTemplate {
    id: string
    organization_id: string
    channel_id: string | null
    name: string
    content: string
    category: 'text' | 'hsm'
    status: 'active' | 'rejected'
    created_at: string
}

export async function getTemplates() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    const supabase = await createClient()
    const { data } = await supabase
        .from("messaging_templates")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })

    return (data || []) as MessageTemplate[]
}

export async function createTemplate(input: {
    name: string
    content: string
    category: 'text' | 'hsm'
    channel_id?: string
}) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Organization context required")

    const supabase = await createClient()
    const { data, error } = await supabase
        .from("messaging_templates")
        .insert({
            organization_id: orgId,
            name: input.name,
            content: input.content,
            category: input.category,
            channel_id: input.channel_id || null
        })
        .select()
        .single()

    if (error) throw new Error(error.message)
    revalidatePath("/crm/settings/templates")
    return data
}

export async function updateTemplate(id: string, input: Partial<MessageTemplate>) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Organization context required")

    const supabase = await createClient()
    const { error } = await supabase
        .from("messaging_templates")
        .update(input)
        .eq("id", id)
        .eq("organization_id", orgId)

    if (error) throw new Error(error.message)
    revalidatePath("/crm/settings/templates")
}

export async function deleteTemplate(id: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Organization context required")

    const supabase = await createClient()
    const { error } = await supabase
        .from("messaging_templates")
        .delete()
        .eq("id", id)
        .eq("organization_id", orgId)

    if (error) throw new Error(error.message)
    revalidatePath("/crm/settings/templates")
}
