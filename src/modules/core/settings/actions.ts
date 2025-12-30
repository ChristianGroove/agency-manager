"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { getActiveModules } from "@/modules/core/saas/actions"

export async function getSettings() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return null

    // Try to get the settings
    const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq('organization_id', orgId)
        .maybeSingle()

    if (error) {
        console.error("Error fetching settings:", error)
        return null
    }

    if (!data) {
        // No settings found, create default for this Org
        // Provide defaults for potential NOT NULL columns
        const defaultSettings = {
            organization_id: orgId,
            agency_name: 'My Agency', // Fallback
            agency_email: 'contact@example.com',
            agency_currency: 'USD',
            default_language: 'en',
            portal_enabled: true
            // Add more if needed based on failures
        }

        const { data: newData, error: createError } = await supabaseAdmin
            .from("organization_settings")
            .insert(defaultSettings)
            .select()
            .single()

        if (createError) {
            // Check for unique violation (Race condition: another request created it first)
            if (createError.code === '23505') {
                console.warn("[getSettings] Recovering from duplicate creation race condition")
                const { data: existingData } = await supabaseAdmin
                    .from("organization_settings")
                    .select("*")
                    .eq('organization_id', orgId)
                    .single()

                return existingData
            }

            console.error("Error creating default settings:", JSON.stringify(createError, null, 2))
            // If it fails, return null but log strictly
            return null
        }
        return newData
    }

    return data
}

/**
 * Validate settings data based on organization's active modules
 * Prevents users from updating fields they don't have access to
 */
async function validateSettingsData(data: any, activeModules: string[]) {
    const validatedData: any = {}

    // Define field-to-module mapping
    const fieldModuleMap: Record<string, string> = {
        // Billing fields - require module_invoicing
        'invoice_prefix': 'module_invoicing',
        'invoice_next_number': 'module_invoicing',
        'quote_prefix': 'module_invoicing',
        'quote_next_number': 'module_invoicing',
        'default_payment_terms': 'module_invoicing',
        'invoice_footer_text': 'module_invoicing',
        'invoice_legal_text': 'module_invoicing',
        'default_due_days': 'module_invoicing',
        'default_tax_name': 'module_invoicing',
        'default_tax_rate': 'module_invoicing',

        // Payment fields - require module_payments or module_invoicing
        'wompi_public_key': 'module_payments',
        'wompi_private_key': 'module_payments',
        'wompi_integrity_secret': 'module_payments',
        'wompi_currency': 'module_payments',
        'wompi_test_mode': 'module_payments',
        'stripe_public_key': 'module_payments',
        'stripe_private_key': 'module_payments',
        'payment_methods_enabled': 'module_payments',
        'enable_portal_payments': 'module_payments',
        'enable_multi_invoice_payment': 'module_payments',
        'min_payment_amount': 'module_payments',
        'payment_pre_message': 'module_payments',
        'payment_success_message': 'module_payments',
        'wompi_environment': 'module_payments',

        // Communication fields - require module_communications or module_invoicing
        'comm_templates': 'module_communications',
        'comm_whatsapp_number': 'module_communications',
        'comm_sender_name': 'module_communications',
        'comm_assisted_mode': 'module_communications',

        // Document branding fields - require module_invoicing
        'document_primary_color': 'module_invoicing',
        'document_secondary_color': 'module_invoicing',
        'document_logo_url': 'module_invoicing',
        'document_logo_size': 'module_invoicing',
        'document_template_style': 'module_invoicing',
        'document_show_watermark': 'module_invoicing',
        'document_watermark_text': 'module_invoicing',
        'document_font_family': 'module_invoicing',
        'document_header_text_color': 'module_invoicing',
        'document_footer_text_color': 'module_invoicing',

        // Email / System Notification fields (new)
        'email_sender_name': 'module_communications',
        'email_reply_to': 'module_communications',
    }
    for (const [key, value] of Object.entries(data)) {
        const requiredModule = fieldModuleMap[key]

        // If no module required, allow (core fields - always accessible)
        if (!requiredModule) {
            validatedData[key] = value
            continue
        }

        // Check if organization has the required module
        if (activeModules.includes(requiredModule)) {
            validatedData[key] = value
        } else if (requiredModule === 'module_communications' && activeModules.includes('module_invoicing')) {
            // Special case: allow comm templates if they have invoicing (for transactional emails)
            validatedData[key] = value
        } else if (requiredModule === 'module_payments' && activeModules.includes('module_invoicing')) {
            // Special case: allow payment fields if they have invoicing
            validatedData[key] = value
        } else {
            console.warn(`[Security] Skipping field "${key}" - module "${requiredModule}" not active for organization`)
            // Don't include unauthorized field in update
        }
    }

    return { data: validatedData }
}

export async function updateSettings(data: any) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        return { error: "No organization selected" }
    }

    // Extract ID
    const { id, ...updateData } = data

    if (!id) {
        return { error: "Settings ID is required" }
    }

    // SECURITY: Verify module access before allowing updates
    const activeModules = await getActiveModules(orgId)
    const validatedData = await validateSettingsData(updateData, activeModules || [])

    // Update with validated data only
    const { error } = await supabase
        .from("organization_settings")
        .update({
            ...validatedData.data,
            updated_at: new Date().toISOString()
        })
        .eq("id", id)

    if (error) {
        console.error("Error updating settings:", error)
        return { error: error.message }
    }

    revalidatePath("/settings")
    revalidatePath("/", "layout")

    return { success: true }
}

/**
 * =======================
 * PUBLIC BRANDING (Unauthenticated)
 * =======================
 */

export interface PublicBranding {
    name: string
    slug: string
    portal_logo_url: string | null
    portal_login_background_url: string | null
    brand_font_family: string | null
    portal_login_background_color: string | null
}

/**
 * Get public branding for an organization by slug
 * Safe for public use (unauthenticated)
 */
export async function getPublicBranding(slug: string): Promise<PublicBranding | null> {
    const supabase = await createClient()
    const { getEffectiveBranding } = await import('@/modules/core/branding/actions')

    // 1. Get Org ID and Name
    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('slug', slug)
        .single()

    if (orgError || !org) return null

    // 2. Get Effective Branding (handles White Label checks + Default fallbacks)
    const branding = await getEffectiveBranding(org.id)

    // 3. Map to PublicBranding interface
    return {
        name: branding.name,
        slug: org.slug,
        portal_logo_url: branding.logos.portal || null,
        portal_login_background_url: branding.logos.login_bg || null,
        brand_font_family: branding.font_family || null,
        portal_login_background_color: branding.login_bg_color || null
    }
}

/**
 * =======================
 * ORGANIZATION BRANDING
 * =======================
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

    // Upsert organization_settings
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

/**
 * =======================
 * DOCUMENT BRANDING
 * =======================
 */

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
export async function getDocumentBrandingDefaults(): Promise<DocumentBrandingSettings> {
    return {
        document_primary_color: '#6B7280', // gray-500 (neutral)
        document_secondary_color: '#6B7280', // gray-500 (neutral)
        document_logo_url: undefined,
        document_logo_size: 'medium',
        document_template_style: 'modern',
        document_show_watermark: true,
        document_font_family: 'Inter',
        document_header_text_color: '#1F2937', // gray-800
        document_footer_text_color: '#6B7280', // gray-500
    }
}
