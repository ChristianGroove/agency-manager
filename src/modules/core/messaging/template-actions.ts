"use server"

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"

// Meta Structure Types
export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
export type TemplateStatus = 'APPROVED' | 'REJECTED' | 'PENDING' | 'PAUSED' | 'DISABLED'

export interface TemplateButton {
    type: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL'
    text: string
    url?: string // For URL buttons
    phone_number?: string // For Phone buttons
}

export interface TemplateComponent {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
    text?: string
    buttons?: TemplateButton[]
    example?: {
        header_handle?: string[]
        body_text?: string[][]
    }
}

export interface MessageTemplate {
    id: string
    organization_id: string
    channel_id: string | null
    name: string
    category: TemplateCategory
    language: string
    components: TemplateComponent[]
    status: TemplateStatus
    meta_id?: string
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
    category: TemplateCategory
    language: string
    components: TemplateComponent[]
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
            category: input.category,
            language: input.language,
            components: input.components,
            status: 'PENDING',
            channel_id: input.channel_id || null,
            content: extractBodyText(input.components) // Legacy fallback for snippets
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

    // If components update, update legacy content preview too
    const updates: any = { ...input }
    if (input.components) {
        updates.content = extractBodyText(input.components)
    }

    const { error } = await supabase
        .from("messaging_templates")
        .update(updates)
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

// Helper to extract plain text for legacy list view
function extractBodyText(components: TemplateComponent[]): string {
    const body = components.find(c => c.type === 'BODY')
    return body?.text || "Sin contenido de texto"
}
