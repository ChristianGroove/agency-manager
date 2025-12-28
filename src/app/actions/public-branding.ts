"use server"

import { createClient } from '@/lib/supabase-server'

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

    // 1. Get Org ID and Name
    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('slug', slug)
        .single()

    if (orgError || !org) return null

    // 2. Get Settings
    const { data: settings } = await supabase
        .from('organization_settings')
        .select(`
            portal_logo_url,
            portal_login_background_url,
            brand_font_family,
            portal_login_background_color
        `)
        .eq('organization_id', org.id)
        .single()

    return {
        name: org.name,
        slug: org.slug,
        portal_logo_url: settings?.portal_logo_url || null,
        portal_login_background_url: settings?.portal_login_background_url || null,
        brand_font_family: settings?.brand_font_family || null,
        portal_login_background_color: settings?.portal_login_background_color || null
    }
}
