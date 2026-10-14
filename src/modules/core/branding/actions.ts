"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { cache } from "react"
import { revalidatePath } from "next/cache"
import { requireOrgRole } from "@/modules/core/iam/services/org-roles"
import { requireSuperAdmin } from "@/modules/core/iam/services/platform-roles"
import { BrandingConfig } from "@/types/branding"

function debugLog(step: string, data: any) {
    console.log(`[BRANDING_DEBUG] ${step}:`, JSON.stringify(data, null, 2))
}

// Default "Pixy" Branding (Safety Fallback)
const DEFAULT_BRANDING: BrandingConfig = {
    name: "Pixy",
    logos: {
        main: "/branding/logo light.svg", // Logo for dark backgrounds (white text)
        main_light: "/branding/logo dark.svg", // Logo for light backgrounds (black text)
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
    socials: {},
    country: "Colombia",
    currency: "COP",
    timezone: "America/Bogota",
    language: "es",
    portal_language: "es",
    date_format: "DD/MM/YYYY",
    currency_format: "es-CO",
    email_style: "neo"
}

// Known deleted storage objects from the October 2026 storage incident
const DELETED_LEGACY_URLS = new Set([
    'https://amwlwmkejdjskukdfwut.supabase.co/storage/v1/object/public/branding/c3b2058f-487c-442f-a9a0-c1c7d3fb0883/1769815057247_rgx43z2xg.png',
    'https://amwlwmkejdjskukdfwut.supabase.co/storage/v1/object/public/branding/c3b2058f-487c-442f-a9a0-c1c7d3fb0883/1769815064697_1yqivrsbn.png',
    'https://amwlwmkejdjskukdfwut.supabase.co/storage/v1/object/public/branding/c3b2058f-487c-442f-a9a0-c1c7d3fb0883/1767709889548_3ngmixl7c.svg'
])

function sanitizeAssetUrl(url?: string | null, fallback?: string | null): string | null {
    if (!url || DELETED_LEGACY_URLS.has(url.trim())) {
        return fallback || null
    }
    return url
}

/**
 * Get Platform Settings (Queen Brand) - Singleton ID=1
 */
export const getPlatformSettings = cache(async () => {
    const supabase = await createClient()

    // 1. Fetch Platform Settings (Publicly readable)
    const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("id", 1)
        .single()

    if (error || !data) {
        return DEFAULT_BRANDING
    }

    return {
        name: data.agency_name || DEFAULT_BRANDING.name,
        logos: {
            main: sanitizeAssetUrl(data.main_logo_url, DEFAULT_BRANDING.logos.main),
            main_light: sanitizeAssetUrl(data.main_logo_light_url, DEFAULT_BRANDING.logos.main_light),
            portal: sanitizeAssetUrl(data.portal_logo_url, DEFAULT_BRANDING.logos.portal),
            favicon: sanitizeAssetUrl(data.favicon_url, DEFAULT_BRANDING.logos.favicon),
            login_bg: data.login_background_url || null
        },
        colors: {
            primary: data.brand_color_primary || DEFAULT_BRANDING.colors.primary,
            secondary: data.brand_color_secondary || DEFAULT_BRANDING.colors.secondary
        },
        website: data.social_links?.website || "https://pixy.com.co",
        font_family: "Inter",
        login_bg_color: "#F3F4F6",
        email_style: data.email_style || 'neo',
        socials: data.social_links || {}
    } as BrandingConfig
})

/**
 * Update Platform Settings (Super Admin Only)
 */
export async function updatePlatformSettings(data: Partial<BrandingConfig>) {
    await requireSuperAdmin()
    const updatePayload: any = {}

    if (data.name) updatePayload.agency_name = data.name
    if (data.logos?.main !== undefined) updatePayload.main_logo_url = data.logos.main
    if (data.logos?.main_light !== undefined) updatePayload.main_logo_light_url = data.logos.main_light
    if (data.logos?.portal !== undefined) updatePayload.portal_logo_url = data.logos.portal
    if (data.logos?.favicon !== undefined) updatePayload.favicon_url = data.logos.favicon
    if (data.logos?.login_bg !== undefined) updatePayload.login_background_url = data.logos.login_bg
    if (data.colors?.primary) updatePayload.brand_color_primary = data.colors.primary
    if (data.colors?.secondary) updatePayload.brand_color_secondary = data.colors.secondary
    if (data.socials) updatePayload.social_links = { ...data.socials }
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
        console.error("[updatePlatformSettings] Save failed:", { code: error.code })
        throw new Error("No se pudo guardar la marca global. Intenta nuevamente.")
    }

    revalidatePath("/platform/admin")
    revalidatePath("/platform/adn")
    revalidatePath("/", "layout")
    return { success: true }
}

/**
 * Core Logic: Get Effective Branding for an Organization
 */
export const getEffectiveBranding = cache(async (orgId?: string | null): Promise<BrandingConfig> => {
    if (!orgId) {
        return getPlatformSettings()
    }

    const [platformBranding, orgResult, tenantSettingsResult] = await Promise.all([
        getPlatformSettings(),
        (await createClient())
            .from("organizations")
            .select(`
                branding_tier_id,
                branding_tier:branding_tiers(id, name, features)
            `)
            .eq("id", orgId)
            .single(),
        (await createClient())
            .from("organization_settings")
            .select("*")
            .eq("organization_id", orgId)
            .maybeSingle()
    ])

    const { data: org } = orgResult
    const { data: tenantSettings } = tenantSettingsResult

    const { canCustomizeLogo, canCustomizeColors } = getBrandingPermissions(org)

    if (!tenantSettings) return platformBranding

    const sanitizeTenantLogo = (val: any) => sanitizeAssetUrl(val, null)
    const pickLogo = (tenantVal: any, platformVal: any) => {
        const cleanTenant = sanitizeTenantLogo(tenantVal)
        const cleanPlatform = sanitizeAssetUrl(platformVal, null)
        return canCustomizeLogo ? (cleanTenant || cleanPlatform) : cleanPlatform
    }
    const pickColor = (tenantVal: any, platformVal: any) => canCustomizeColors ? tenantVal || platformVal : platformVal
    const pickGeneral = (tenantVal: any, platformVal: any) => tenantVal || platformVal

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
        email: tenantSettings.agency_email,
        phone: tenantSettings.agency_phone,
        address: tenantSettings.agency_address,
        font_family: pickGeneral(tenantSettings.brand_font_family, platformBranding.font_family),
        login_bg_color: pickColor(tenantSettings.portal_login_background_color, platformBranding.login_bg_color),
        custom_domain: tenantSettings.custom_domain || null,
        invoice_footer: tenantSettings.invoice_footer || null,
        document_logo_size: tenantSettings.document_logo_size || 'medium',
        document_show_watermark: tenantSettings.document_show_watermark ?? true,
        document_header_text_color: tenantSettings.document_header_text_color,
        document_footer_text_color: tenantSettings.document_footer_text_color,
        document_font_family: tenantSettings.document_font_family,
        socials: {
            facebook: tenantSettings.social_facebook || null,
            instagram: tenantSettings.social_instagram || null,
            linkedin: tenantSettings.social_linkedin || null,
            twitter: tenantSettings.social_twitter || null,
            youtube: tenantSettings.social_youtube || null
        },
        country: tenantSettings.agency_country || platformBranding.country || 'Colombia',
        currency: tenantSettings.agency_currency || platformBranding.currency || 'COP',
        timezone: tenantSettings.agency_timezone || platformBranding.timezone || 'America/Bogota',
        language: tenantSettings.default_language || platformBranding.language || 'es',
        portal_language: tenantSettings.portal_language || platformBranding.portal_language || 'es',
        date_format: tenantSettings.date_format || platformBranding.date_format || 'DD/MM/YYYY',
        currency_format: tenantSettings.currency_format || platformBranding.currency_format || 'es-CO',
        email_style: tenantSettings.email_style || platformBranding.email_style || 'neo'
    } as BrandingConfig
})

/**
 * Upload Branding Asset (Logo, Favicon, Banner, etc.)
 * Handles automatic bucket creation or fallback to public-assets if requested bucket doesn't exist
 */
export async function uploadBrandingAsset(formData: FormData) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        throw new Error("No autorizado")
    }

    const { getCurrentOrganizationId } = await import('@/modules/core/organizations/actions/crud')
    const isPlatformAsset = formData.get("scope") === "platform"
    if (isPlatformAsset) await requireSuperAdmin()
    const orgId = isPlatformAsset ? null : await getCurrentOrganizationId()
    if (orgId) {
        try {
            await requireOrgRole('admin')
        } catch (e) {
            throw new Error("Unauthorized: Solo administradores pueden subir archivos.")
        }
    }

    const file = formData.get("file") as File
    let targetBucket = (formData.get("bucket") as string) || "public-assets"

    if (!file) {
        throw new Error("No se ha seleccionado ningún archivo")
    }

    if (file.size > 5 * 1024 * 1024) throw new Error("El archivo no debe superar 5MB")
    if (!file.type.startsWith("image/")) throw new Error("Solo imágenes son permitidas")

    const fileExt = file.name.split(".").pop()
    const storagePrefix = orgId || user.id
    const fileName = `${storagePrefix}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`

    // 1. Intentar subir al bucket deseado
    const { error: initialUploadError } = await supabase.storage
        .from(targetBucket)
        .upload(fileName, file, {
            upsert: true,
            contentType: file.type
        })

    if (!initialUploadError) {
        const { data: { publicUrl } } = supabase.storage
            .from(targetBucket)
            .getPublicUrl(fileName)

        return { success: true, url: publicUrl }
    }

    // 2. Si falló por falta de bucket, crearlo vía supabaseAdmin e reintentar
    try {
        await supabaseAdmin.storage.createBucket(targetBucket, { public: true })
    } catch (e) {
        console.warn(`[Storage] Could not create bucket ${targetBucket}:`, e)
    }

    const { error: adminRetryError } = await supabaseAdmin.storage
        .from(targetBucket)
        .upload(fileName, file, {
            upsert: true,
            contentType: file.type
        })

    if (!adminRetryError) {
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from(targetBucket)
            .getPublicUrl(fileName)

        return { success: true, url: publicUrl }
    }

    // 3. Fallback universal al bucket conocido 'public-assets'
    targetBucket = "public-assets"
    try {
        await supabaseAdmin.storage.createBucket("public-assets", { public: true })
    } catch (e) {}

    const { error: fallbackUploadError } = await supabaseAdmin.storage
        .from("public-assets")
        .upload(fileName, file, {
            upsert: true,
            contentType: file.type
        })

    if (fallbackUploadError) {
        console.error("[Storage Upload Error]:", fallbackUploadError)
        throw new Error("Error al subir imagen al servidor de almacenamiento.")
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
        .from("public-assets")
        .getPublicUrl(fileName)

    return { success: true, url: publicUrl }
}

/**
 * Update Effective Branding (Organization Level)
 */
export async function updateOrganizationBranding(settings: BrandingConfig) {
    const orgId = await (await import('@/modules/core/organizations/actions/crud')).getCurrentOrganizationId()
    if (!orgId) throw new Error("No organization context found")

    await requireOrgRole('admin')

    const supabase = await createClient()

    const [orgResult, platformBranding, existingResult] = await Promise.all([
        supabase.from("organizations")
            .select("branding_tier_id, branding_tier:branding_tiers(features)")
            .eq("id", orgId)
            .single(),
        getPlatformSettings(),
        supabase.from("organization_settings")
            .select("id")
            .eq("organization_id", orgId)
            .maybeSingle()
    ])
    if (orgResult.error || !orgResult.data || existingResult.error) {
        throw new Error("No se pudo verificar la configuración de marca de la organización")
    }
    const { data: existing } = existingResult
    const { canCustomizeLogo, canCustomizeColors } = getBrandingPermissions(orgResult.data)

    // Effective branding includes platform defaults. Persist only actual tenant overrides.
    const logoOverride = (value: string | null | undefined, globalValue: string | null | undefined) =>
        canCustomizeLogo ? (value === undefined ? undefined : value && value !== globalValue ? value : null) : null
    const colorOverride = (value: string | null | undefined, globalValue: string | null | undefined) =>
        canCustomizeColors ? (value === undefined ? undefined : value && value !== globalValue ? value : null) : null

    const payload = {
        organization_id: orgId,
        agency_name: settings.name,
        main_logo_url: logoOverride(settings.logos.main, platformBranding.logos.main),
        main_logo_light_url: logoOverride(settings.logos.main_light, platformBranding.logos.main_light),
        portal_logo_url: logoOverride(settings.logos.portal, platformBranding.logos.portal),
        isotipo_url: logoOverride(settings.logos.favicon, platformBranding.logos.favicon),
        portal_login_background_url: logoOverride(settings.logos.login_bg, platformBranding.logos.login_bg),
        portal_primary_color: colorOverride(settings.colors.primary, platformBranding.colors.primary),
        portal_secondary_color: colorOverride(settings.colors.secondary, platformBranding.colors.secondary),
        agency_website: settings.website,
        agency_email: settings.email,
        agency_phone: settings.phone,
        agency_address: settings.address,
        brand_font_family: settings.font_family,
        portal_login_background_color: colorOverride(settings.login_bg_color, platformBranding.login_bg_color),
        custom_domain: settings.custom_domain,
        invoice_footer: settings.invoice_footer,
        document_logo_size: settings.document_logo_size,
        document_show_watermark: settings.document_show_watermark,
        document_header_text_color: settings.document_header_text_color,
        document_footer_text_color: settings.document_footer_text_color,
        document_font_family: settings.document_font_family,
        social_facebook: settings.socials?.facebook,
        social_instagram: settings.socials?.instagram,
        social_linkedin: settings.socials?.linkedin,
        social_twitter: settings.socials?.twitter,
        social_youtube: settings.socials?.youtube,
        default_language: settings.language || 'es',
        portal_language: settings.portal_language || 'es',
        agency_country: settings.country || null,
        agency_currency: settings.currency || 'COP',
        agency_timezone: settings.timezone || null,
        date_format: settings.date_format || 'DD/MM/YYYY',
        currency_format: settings.currency_format || 'es-CO',
        email_style: settings.email_style || 'neo',
        updated_at: new Date().toISOString()
    }

    let saveError: any = null
    if (existing?.id) {
        const { error } = await supabaseAdmin
            .from("organization_settings")
            .update(payload)
            .eq("id", existing.id)
        saveError = error
    } else {
        const { error } = await supabaseAdmin
            .from("organization_settings")
            .insert(payload)
        saveError = error
    }

    if (saveError) throw new Error(saveError.message)

    revalidatePath("/platform/adn")
    revalidatePath("/platform/settings")
    revalidatePath("/", "layout")
    revalidatePath("/portal", "layout")
    return { success: true }
}

function getBrandingPermissions(org: any) {
    const tier = Array.isArray(org?.branding_tier) ? org.branding_tier[0] : org?.branding_tier
    const features = tier?.features || {}
    const tierId = org?.branding_tier_id || ''
    const isPremiumTier = tierId.includes('whitelabel') || tierId.includes('custom')
    return {
        canCustomizeLogo: features.custom_logo === true || isPremiumTier,
        canCustomizeColors: features.custom_colors === true || isPremiumTier,
    }
}
