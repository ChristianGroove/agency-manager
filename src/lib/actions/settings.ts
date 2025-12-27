"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "./organizations"
import { getActiveModules } from "@/app/actions/modules-actions"

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
        const { supabaseAdmin } = await import("@/lib/supabase-admin")

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
    }

    // Validate each field
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
