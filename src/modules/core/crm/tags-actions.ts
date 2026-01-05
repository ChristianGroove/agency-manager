"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { ActionResponse } from "./leads-actions"

export type Tag = {
    id: string
    organization_id: string
    name: string
    color: string
    created_at: string
}

// --- USER ACTIONS (For UI) ---

export async function getTags(): Promise<Tag[]> {
    const supabase = await createClient()
    try {
        const orgId = await getCurrentOrganizationId()
        if (!orgId) return []

        const { data, error } = await supabase
            .from('crm_tags')
            .select('*')
            .eq('organization_id', orgId)
            .order('name')

        if (error) throw error
        return data as Tag[]
    } catch (e) {
        console.error("Error fetching tags:", e)
        return []
    }
}

export async function createTag(name: string, color: string = '#808080'): Promise<ActionResponse<Tag>> {
    const supabase = await createClient()
    try {
        const orgId = await getCurrentOrganizationId()
        if (!orgId) throw new Error("Unauthorized")

        const { data, error } = await supabase
            .from('crm_tags')
            .insert({
                organization_id: orgId,
                name,
                color
            })
            .select()
            .single()

        if (error) throw error
        return { success: true, data: data as Tag }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// --- SYSTEM ACTIONS (For Automation) ---

/**
 * Add a tag to a lead (System/Automation)
 * 1. Finds existing tag by name OR creates it if it doesn't exist.
 * 2. Links it to the lead.
 */
export async function addLeadTagSystem(leadId: string, tagName: string, organizationId: string): Promise<ActionResponse<void>> {
    try {
        if (!organizationId) throw new Error("Organization ID required")

        // 1. Find or Create Tag
        // Check existence
        const { data: existingTag } = await supabaseAdmin
            .from('crm_tags')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('name', tagName)
            .single()

        let tagId = existingTag?.id

        if (!tagId) {
            // Create new
            const { data: newTag, error: createError } = await supabaseAdmin
                .from('crm_tags')
                .insert({
                    organization_id: organizationId,
                    name: tagName,
                    color: '#f59e0b' // Default orange/yellow for automated tags
                })
                .select('id')
                .single()

            if (createError) throw createError
            tagId = newTag.id
        }

        // 2. Link to Lead
        const { error: linkError } = await supabaseAdmin
            .from('crm_lead_tags')
            .insert({
                lead_id: leadId,
                tag_id: tagId
            })
            // Ignore conflict if already tagged
            .maybeSingle()

        if (linkError && linkError.code !== '23505') { // 23505 = unique_violation
            throw linkError
        }

        return { success: true }

    } catch (e: any) {
        console.error("[System] Error adding tag:", e)
        return { success: false, error: e.message }
    }
}

export async function removeLeadTagSystem(leadId: string, tagName: string, organizationId: string): Promise<ActionResponse<void>> {
    try {
        // 1. Find Tag ID
        const { data: existingTag } = await supabaseAdmin
            .from('crm_tags')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('name', tagName)
            .single()

        if (!existingTag) return { success: true } // Tag doesn't exist, easier to say success

        // 2. Delete Link
        const { error } = await supabaseAdmin
            .from('crm_lead_tags')
            .delete()
            .eq('lead_id', leadId)
            .eq('tag_id', existingTag.id)

        if (error) throw error
        return { success: true }

    } catch (e: any) {
        console.error("[System] Error removing tag:", e)
        return { success: false, error: e.message }
    }
}
