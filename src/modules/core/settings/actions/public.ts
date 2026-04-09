"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * PUBLIC SETTINGS & BRANDING (Safe for unauthenticated use)
 */

export async function getPublicBranding(slug: string) {
    const supabase = await createClient()
    const { getEffectiveBranding } = await import('@/modules/core/branding/actions')

    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('slug', slug)
        .single()

    if (orgError || !org) return null

    const branding = await getEffectiveBranding(org.id)

    return {
        name: branding.name,
        slug: org.slug,
        portal_logo_url: branding.logos.portal || null,
        portal_login_background_url: branding.logos.login_bg || null,
        brand_font_family: branding.font_family || null,
        portal_login_background_color: branding.login_bg_color || null
    }
}

export async function getPublicInvoiceSettings(organizationId: string) {
    if (!organizationId) return {}

    const { data, error } = await supabaseAdmin
        .from("organization_settings")
        .select(`
            agency_name,
            agency_email,
            agency_phone,
            agency_website,
            agency_legal_name,
            legal_text,
            main_logo_url,
            portal_logo_url,
            document_logo_url
        `)
        .eq('organization_id', organizationId)
        .maybeSingle()

    if (error) return {}

    const { data: paymentMethods } = await supabaseAdmin
        .from('organization_payment_methods')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)

    const s = data as any
    return {
        ...s,
        invoice_legal_text: s?.legal_text,
        agency_logo: s?.document_logo_url || s?.main_logo_url || s?.portal_logo_url,
        company_name: s?.agency_legal_name || s?.agency_name,
        payment_methods: paymentMethods || []
    }
}
