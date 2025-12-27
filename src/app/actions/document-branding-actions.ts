"use server"

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/lib/actions/organizations"
import { revalidatePath } from "next/cache"

export interface DocumentBrandingSettings {
    document_primary_color: string
    document_secondary_color: string
    document_logo_url?: string
    document_logo_size: 'small' | 'medium' | 'large'
    document_template_style: 'minimal' | 'modern' | 'classic'
    document_show_watermark: boolean
    document_watermark_text?: string
    document_font_family: string
    document_header_text_color: string
    document_footer_text_color: string
}

/**
 * Get document branding settings for current or specified organization
 */
export async function getDocumentBranding(orgId?: string): Promise<DocumentBrandingSettings | null> {
    const supabase = await createClient()
    const organizationId = orgId || await getCurrentOrganizationId()

    if (!organizationId) {
        console.error("[getDocumentBranding] No organization ID")
        return null
    }

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

    if (error) {
        console.error("[getDocumentBranding] Error:", error)
        return null
    }

    if (!data) {
        // Return defaults if no settings found
        return getDocumentBrandingDefaults()
    }

    return data as DocumentBrandingSettings
}

/**
 * Update document branding settings
 */
export async function updateDocumentBranding(settings: Partial<DocumentBrandingSettings>) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        return { error: "No organization selected" }
    }

    const { error } = await supabase
        .from("organization_settings")
        .update({
            ...settings,
            updated_at: new Date().toISOString()
        })
        .eq('organization_id', orgId)

    if (error) {
        console.error("[updateDocumentBranding] Error:", error)
        return { error: error.message }
    }

    revalidatePath('/settings')
    revalidatePath('/invoices', 'page')
    revalidatePath('/quotes', 'page')

    return { success: true }
}

/**
 * Get default document branding settings
 */
export function getDocumentBrandingDefaults(): DocumentBrandingSettings {
    return {
        document_primary_color: '#6D28D9', // purple-600
        document_secondary_color: '#EC4899', // pink-500
        document_logo_url: '/branding/logo dark.svg',
        document_logo_size: 'medium',
        document_template_style: 'modern',
        document_show_watermark: true,
        document_watermark_text: undefined,
        document_font_family: 'Inter',
        document_header_text_color: '#1F2937', // gray-800
        document_footer_text_color: '#6B7280', // gray-500
    }
}
