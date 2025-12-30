"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { getActiveModules } from "@/modules/core/saas/actions"

export interface BrandingConfig {
    name: string
    logos: {
        main: string | null
        portal: string | null
        favicon: string | null
        dashboard_bg?: string | null
        login_bg?: string | null
    }
    colors: {
        primary: string
        secondary: string
    }
    website?: string
    font_family?: string | null
    login_bg_color?: string | null
    socials: {
        facebook?: string
        instagram?: string
        twitter?: string
        linkedin?: string
    }
}

// Default "Pixy" Branding (Safety Fallback)
const DEFAULT_BRANDING: BrandingConfig = {
    name: "Pixy",
    logos: {
        main: "/branding/logo.svg",
        portal: "/branding/logo_icon.svg",
        favicon: "/favicon.ico",
        dashboard_bg: null,
        login_bg: null
    },
    colors: {
        primary: "#4F46E5", // Indigo-600
        secondary: "#EC4899" // Pink-500
    },
    website: "https://pixy.com.co",
    font_family: "Inter",
    login_bg_color: "#F3F4F6", // Gray-100
    socials: {}
}

/**
 * Get Platform Settings (Queen Brand) - Singleton ID=1
 */
export async function getPlatformSettings() {
    const supabase = await createClient()

    // 1. Fetch Platform Settings (Publicly readable)
    const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("id", 1)
        .single()

    if (error || !data) {
        // Fallback or create if missing? 
        // We rely on migration, but safe fallback to standard Pixy object
        return DEFAULT_BRANDING
    }

    return {
        name: data.agency_name,
        logos: {
            main: data.main_logo_url,
            portal: data.portal_logo_url,
            favicon: data.favicon_url,
            login_bg: data.login_background_url
        },
        colors: {
            primary: data.brand_color_primary,
            secondary: data.brand_color_secondary
        },
        website: data.social_links?.website || "https://pixy.com.co",
        font_family: "Inter", // Platform default
        login_bg_color: "#F3F4F6", // Platform default
        socials: data.social_links || {}
    } as BrandingConfig
}

/**
 * Update Platform Settings (Super Admin Only)
 */
export async function updatePlatformSettings(data: Partial<BrandingConfig>) {
    // Flatten logic for DB update
    const updatePayload: any = {}

    if (data.name) updatePayload.agency_name = data.name
    if (data.logos?.main) updatePayload.main_logo_url = data.logos.main
    if (data.logos?.portal) updatePayload.portal_logo_url = data.logos.portal
    if (data.logos?.favicon) updatePayload.favicon_url = data.logos.favicon
    if (data.logos?.login_bg) updatePayload.login_background_url = data.logos.login_bg
    if (data.colors?.primary) updatePayload.brand_color_primary = data.colors.primary
    if (data.colors?.secondary) updatePayload.brand_color_secondary = data.colors.secondary
    if (data.socials) updatePayload.social_links = data.socials
    // Platform settings stores website in social_links JSONB for now
    if (data.website && updatePayload.social_links) {
        updatePayload.social_links.website = data.website
    } else if (data.website) {
        updatePayload.social_links = { website: data.website }
    }

    const { error } = await supabaseAdmin
        .from("platform_settings")
        .update({
            ...updatePayload,
            updated_at: new Date().toISOString()
        })
        .eq("id", 1)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath("/")
    revalidatePath("/platform/admin/branding")
    return { success: true }
}


/**
 * Core Logic: Get Effective Branding for an Organization
 * Cascade: Tenant w/ Module > Tenant w/o Module > Queen Brand
 */
export async function getEffectiveBranding(orgId?: string | null): Promise<BrandingConfig> {

    // 1. Get Base Platform Branding (Queen Brand)
    const platformBranding = await getPlatformSettings()

    // If no org context, return platform branding (e.g. login page, landing page)
    if (!orgId) return platformBranding

    // 2. Metadata: Check Tenant Modules
    const modules = await getActiveModules(orgId)
    const hasWhiteLabel = modules.includes("module_whitelabel")

    // If no White Label permission, force Platform Branding
    if (!hasWhiteLabel) {
        return platformBranding
    }

    // 3. User has White Label -> Fetch Tenant Overrides
    const supabase = await createClient()
    const { data: tenantSettings } = await supabase
        .from("organization_settings")
        .select(`
            agency_name,
            agency_website,
            main_logo_url,
            portal_logo_url,
            isotipo_url,
            portal_primary_color,
            portal_secondary_color,
            portal_login_background_url,
            brand_font_family,
            portal_login_background_color,
            social_facebook,
            social_instagram,
            social_twitter
        `)
        .eq("organization_id", orgId)
        .single()

    if (!tenantSettings) return platformBranding

    // 4. Merge Tenant Settings over Platform Settings
    return {
        name: tenantSettings.agency_name || platformBranding.name,
        logos: {
            main: tenantSettings.main_logo_url || platformBranding.logos.main,
            portal: tenantSettings.portal_logo_url || platformBranding.logos.portal,
            favicon: tenantSettings.isotipo_url || platformBranding.logos.favicon,
            login_bg: tenantSettings.portal_login_background_url || platformBranding.logos.login_bg
        },
        colors: {
            primary: tenantSettings.portal_primary_color || platformBranding.colors.primary,
            secondary: tenantSettings.portal_secondary_color || platformBranding.colors.secondary
        },
        website: tenantSettings.agency_website || platformBranding.website,
        font_family: tenantSettings.brand_font_family || platformBranding.font_family,
        login_bg_color: tenantSettings.portal_login_background_color || platformBranding.login_bg_color,
        socials: {
            facebook: tenantSettings.social_facebook || platformBranding.socials.facebook,
            instagram: tenantSettings.social_instagram || platformBranding.socials.instagram,
            twitter: tenantSettings.social_twitter || platformBranding.socials.twitter
        }
    }
}
