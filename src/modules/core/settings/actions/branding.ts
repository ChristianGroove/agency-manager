"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { requireOrgRole } from "@/modules/core/iam/services/org-roles"
import { type DocumentBrandingSettings } from "@/modules/features/billing/types"

/**
 * BRANDING ACTIONS
 */

export async function updateOrganizationBranding(data: {
    portal_primary_color?: string
    portal_secondary_color?: string
    portal_title?: string
    portal_logo_url?: string
    isotipo_url?: string
}) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No organization context")

    await requireOrgRole('admin')

    const { error } = await supabase
        .from('organization_settings')
        .upsert({
            organization_id: orgId,
            ...data,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'organization_id'
        })

    if (error) throw error
    revalidatePath('/platform/settings/branding')
    return { success: true }
}

export async function getOrganizationBranding() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return null

    const { data, error } = await supabase
        .from('organization_settings')
        .select('portal_primary_color, portal_secondary_color, portal_title, portal_logo_url, isotipo_url')
        .eq('organization_id', orgId)
        .single()

    if (error) return null
    return data
}

export async function getDocumentBranding(orgId?: string): Promise<DocumentBrandingSettings | null> {
    const supabase = await createClient()
    const organizationId = orgId || await getCurrentOrganizationId()
    if (!organizationId) return null

    const { data, error } = await supabase
        .from("organization_settings")
        .select(`
            document_primary_color,
            document_secondary_color,
            document_logo_url,
            document_logo_size,
            document_template_style,
            document_show_watermark,
            document_watermark_text,
            document_font_family,
            document_header_text_color,
            document_footer_text_color
        `)
        .eq('organization_id', organizationId)
        .maybeSingle()

    if (error) return null
    return (data as DocumentBrandingSettings) || getDocumentBrandingDefaults()
}

export async function updateDocumentBranding(settings: Partial<DocumentBrandingSettings>) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { error: "No organization selected" }

    await requireOrgRole('admin')

    const { error } = await supabase
        .from("organization_settings")
        .update({
            ...settings,
            updated_at: new Date().toISOString()
        })
        .eq('organization_id', orgId)

    if (error) return { error: error.message }
    revalidatePath('/settings')
    return { success: true }
}

function getDocumentBrandingDefaults(): DocumentBrandingSettings {
    return {
        document_primary_color: '#6B7280',
        document_secondary_color: '#6B7280',
        document_logo_size: 'medium',
        document_template_style: 'modern',
        document_show_watermark: true,
        document_font_family: 'Inter',
        document_header_text_color: '#1F2937',
        document_footer_text_color: '#6B7280',
    }
}
