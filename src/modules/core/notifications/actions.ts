"use server"

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

export type EmailTemplate = {
    id: string
    name: string
    template_key: string
    variant_name: string
    subject_template: string
    body_html: string
    design_config: any
    is_active: boolean
}

export async function getEmailTemplates() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error("Unauthorized")

    // Fetch org specific templates + system templates (where org_id is null)
    // Added explicit filter for defense in depth
    const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .or(`organization_id.eq.${orgId},organization_id.is.null`)
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching email templates:", error)
        return []
    }

    return data as EmailTemplate[]
}

export async function updateEmailTemplate(id: string, updates: Partial<EmailTemplate>) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error("Unauthorized")

    // Ensure we are updating a template that belongs to this org
    // If it's a system template (org_id null), we should probably CLONE it instead of updating it directly
    // But for now, let's assume we are updating an existing org template.

    // logic: check if template belongs to org. If not (it's system), create a copy for the org.
    const { data: existing } = await supabase.from("email_templates").select("organization_id").eq("id", id).single()

    if (!existing) throw new Error("Template not found")

    if (existing.organization_id === null) {
        // It's a system template. We must clone it to the org first.
        const { data: source } = await supabase.from("email_templates").select("*").eq("id", id).single()
        if (!source) throw new Error("System template source not found")

        const { data: newTemplate, error: createError } = await supabase
            .from("email_templates")
            .insert({
                ...source,
                id: undefined, // Let DB generate new ID
                organization_id: orgId,
                ...updates,
                created_at: undefined,
                updated_at: undefined
            })
            .select()
            .single()

        if (createError) throw new Error(createError.message)
        return { success: true, data: newTemplate }
    } else {
        // It's already an org template, just update it
        const { data, error } = await supabase
            .from("email_templates")
            .update(updates)
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single()

        if (error) throw new Error(error.message)
        return { success: true, data }
    }
}

export async function setActiveTemplate(templateKey: string, templateId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Unauthorized")

    // 1. Deactivate all others for this key
    await supabase
        .from("email_templates")
        .update({ is_active: false })
        .eq("organization_id", orgId)
        .eq("template_key", templateKey)

    // 2. Activate target
    // If target is system template, clone it first as active
    const { data: target } = await supabase.from("email_templates").select("organization_id").eq("id", templateId).single()

    if (target?.organization_id === null) {
        // Clone as active
        await updateEmailTemplate(templateId, { is_active: true })
        // Note: updateEmailTemplate handles the cloning logic we wrote above
    } else {
        await supabase
            .from("email_templates")
            .update({ is_active: true })
            .eq("id", templateId)
    }

    return { success: true }
}
