"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { getActiveModules } from "@/modules/core/saas/actions"
import { requireOrgRole } from "@/lib/auth/org-roles"

export interface BrandingConfig {
    name: string
    logos: {
        main: string | null
        main_light?: string | null // For light mode
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
    custom_domain?: string | null
    invoice_footer?: string | null
    portal_title?: string | null  // Custom title for client portal

    // Document Specifics
    document_logo_size?: 'small' | 'medium' | 'large'
    document_show_watermark?: boolean

    socials: {
        facebook?: string
        instagram?: string
        twitter?: string
        linkedin?: string
        youtube?: string
    }
}

// Default "Pixy" Branding (Safety Fallback)
const DEFAULT_BRANDING: BrandingConfig = {
    name: "Pixy",
    logos: {
        main: "/branding/logo dark.svg",
        main_light: null,
        portal: "/branding/iso.svg",
        favicon: "/pixy-isotipo.png",
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
            main_light: data.main_logo_light_url,
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
    if (data.logos?.main_light !== undefined) updatePayload.main_logo_light_url = data.logos.main_light
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
        .upsert({
            id: 1,
            ...updatePayload,
            updated_at: new Date().toISOString()
        })

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath("/")
    revalidatePath("/platform/admin/branding")
    return { success: true }
}


/**
 * Core Logic: Get Effective Branding for an Organization
 * Cascade: Tenant w/ Paid Tier > Tenant w/o Paid Tier > Queen Brand
 * Uses branding_tier_id and tier features instead of module_whitelabel
 */
export async function getEffectiveBranding(orgId?: string | null): Promise<BrandingConfig> {

    // 1. If no org context, return platform branding immediately (Single DB call)
    if (!orgId) {
        return getPlatformSettings()
    }

    // 2. Parallel Fetch: Platform + Org with Tier + Tenant Settings
    const [platformBranding, orgResult, tenantSettingsResult] = await Promise.all([
        getPlatformSettings(),
        supabaseAdmin
            .from("organizations")
            .select(`
                branding_tier_id,
                branding_tier:branding_tiers(id, name, features)
            `)
            .eq("id", orgId)
            .single(),
        supabaseAdmin
            .from("organization_settings")
            .select(`
                agency_name,
                agency_website,
                main_logo_url,
                main_logo_light_url,
                portal_logo_url,
                isotipo_url,
                portal_primary_color,
                portal_secondary_color,
                portal_login_background_url,
                brand_font_family,
                portal_login_background_color,
                social_facebook,
                social_instagram,
                social_twitter,
                social_linkedin,
                social_youtube,
                custom_domain,
                invoice_footer,
                document_logo_size,
                document_show_watermark
            `)
            .eq("organization_id", orgId)
            .single()
    ])

    const { data: org } = orgResult
    const { data: tenantSettings } = tenantSettingsResult

    // Get tier features - default to basic (all false) if no tier
    const tierFeatures = (org?.branding_tier as any)?.features || {}
    const canCustomizeLogo = tierFeatures.custom_logo === true
    const canCustomizeColors = tierFeatures.custom_colors === true
    const canRemoveBranding = tierFeatures.remove_pixy_branding === true

    if (!tenantSettings) return platformBranding

    // Helper to pick based on feature permission
    const pickLogo = (tenantVal: any, platformVal: any) => canCustomizeLogo ? (tenantVal || platformVal) : platformVal
    const pickColor = (tenantVal: any, platformVal: any) => canCustomizeColors ? (tenantVal || platformVal) : platformVal
    const pickGeneral = (tenantVal: any, platformVal: any) => canRemoveBranding ? (tenantVal || platformVal) : platformVal

    return {
        name: pickGeneral(tenantSettings.agency_name, platformBranding.name),
        logos: {
            main: pickLogo(tenantSettings.main_logo_url, platformBranding.logos.main),
            main_light: pickLogo(tenantSettings.main_logo_light_url, platformBranding.logos.main_light),
            portal: pickLogo(tenantSettings.portal_logo_url, platformBranding.logos.portal),
            favicon: pickLogo(tenantSettings.isotipo_url, platformBranding.logos.favicon),
            login_bg: pickLogo(tenantSettings.portal_login_background_url, platformBranding.logos.login_bg)
        },
        colors: {
            primary: pickColor(tenantSettings.portal_primary_color, platformBranding.colors.primary),
            secondary: pickColor(tenantSettings.portal_secondary_color, platformBranding.colors.secondary)
        },
        website: pickGeneral(tenantSettings.agency_website, platformBranding.website),
        font_family: pickGeneral(tenantSettings.brand_font_family, platformBranding.font_family),
        login_bg_color: pickColor(tenantSettings.portal_login_background_color, platformBranding.login_bg_color),
        custom_domain: tenantSettings.custom_domain || null,
        invoice_footer: tenantSettings.invoice_footer || null,
        document_logo_size: tenantSettings.document_logo_size || 'medium',
        document_show_watermark: tenantSettings.document_show_watermark ?? true,

        socials: {
            facebook: pickGeneral(tenantSettings.social_facebook, platformBranding.socials.facebook),
            instagram: pickGeneral(tenantSettings.social_instagram, platformBranding.socials.instagram),
            twitter: pickGeneral(tenantSettings.social_twitter, platformBranding.socials.twitter),
            linkedin: pickGeneral(tenantSettings.social_linkedin, platformBranding.socials.linkedin),
            youtube: pickGeneral(tenantSettings.social_youtube, platformBranding.socials.youtube),
        }
    }
}


/**
 * Upload Branding Asset (Logo, Favicon, etc.)
 */
export async function uploadBrandingAsset(formData: FormData) {
    const supabase = await createClient()

    // 1. Verify User (Any auth user can upload? Ideally only Admins/Owners)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        throw new Error("No autorizado")
    }

    // Verify Admin for uploads
    const orgId = await getCurrentOrganizationId()
    if (orgId) {
        // Only check if inside org context. If global profile upload, maybe skip?
        // Branding is usually Org.
        try {
            await requireOrgRole('admin')
        } catch (e) {
            throw new Error("Unauthorized")
        }
    }

    const file = formData.get("file") as File
    const bucket = formData.get("bucket") as string || "branding" // Default to branding bucket

    if (!file) {
        throw new Error("No se ha seleccionado ningún archivo")
    }

    // 2. Validate File
    if (file.size > 5 * 1024 * 1024) throw new Error("El archivo no debe superar 5MB")
    if (!file.type.startsWith("image/")) throw new Error("Solo imágenes son permitidas")

    // 3. Upload to Storage
    const fileExt = file.name.split(".").pop()
    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`

    // Ensure bucket exists or handle error (Assuming 'branding' bucket is public)
    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
            upsert: true,
        })

    if (uploadError) {
        throw new Error("Error al subir imagen: " + uploadError.message)
    }

    // 4. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)

    return { success: true, url: publicUrl }
}

/**
 * Update Effective Branding (Organization Level)
 */
export async function updateOrganizationBranding(settings: BrandingConfig) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    const orgId = await getCurrentOrganizationId()
    if (!orgId) {
        throw new Error("Organization not found")
    }

    try {
        await requireOrgRole('admin')
    } catch (e) {
        throw new Error("Unauthorized: Requires admin role")
    }

    // Map BrandingConfig back to DB columns
    // We update 'organization_settings'. 
    // Note: We should probably check permissions (Owner/Admin) here, but assuming orgId context implies access for now.

    const payload: any = {
        organization_id: orgId,
        updated_at: new Date().toISOString(),

        // Identity
        agency_name: settings.name,
        agency_website: settings.website,
        main_logo_url: settings.logos.main,
        main_logo_light_url: settings.logos.main_light,
        portal_logo_url: settings.logos.portal,
        isotipo_url: settings.logos.favicon,

        // Portal & Review
        portal_primary_color: settings.colors.primary,
        portal_secondary_color: settings.colors.secondary,
        portal_login_background_url: settings.logos.login_bg,
        brand_font_family: settings.font_family,
        portal_login_background_color: settings.login_bg_color,

        // Socials
        social_facebook: settings.socials.facebook,
        social_instagram: settings.socials.instagram,
        social_twitter: settings.socials.twitter,
        social_linkedin: settings.socials.linkedin,
        social_youtube: settings.socials.youtube,

        // New Fields
        custom_domain: settings.custom_domain,
        invoice_footer: settings.invoice_footer,
        document_logo_size: settings.document_logo_size,
        document_show_watermark: settings.document_show_watermark,
    }

    // Remove undefined values to avoid overwriting with null if we want partial updates?
    // But BrandingConfig is "Complete" state from UI usually.
    // However, if we pass undefined, Supabase might ignore or error.
    // Let's clean payload.
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key])

    const { error } = await supabase
        .from("organization_settings")
        .upsert(payload, { onConflict: "organization_id" })

    if (error) {
        throw new Error("Failed to save branding: " + error.message)
    }

    revalidatePath("/platform/settings/branding")
    revalidatePath("/platform/settings")
    return { success: true }
}
