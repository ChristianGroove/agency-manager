"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { cache } from "react"
import { revalidatePath } from "next/cache"
import { requireOrgRole } from "@/modules/core/iam/services/org-roles"
import { BrandingConfig } from "@/types/branding"

function debugLog(step: string, data: any) {
    console.log(`[BRANDING_DEBUG] ${step}:`, JSON.stringify(data, null, 2))
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
    if (data.website && updatePayload.social_links) {
        updatePayload.social_links.website = data.website
    } else if (data.website) {
        updatePayload.social_links = { website: data.website }
    }

    const { error } = await (await createClient())
        .from("platform_settings")
        .upsert({
            id: 1,
            ...updatePayload,
            updated_at: new Date().toISOString()
        })

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath("/platform/admin/branding")
    revalidatePath("/platform/adn")
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

    const tierFeatures = (org?.branding_tier as any)?.features || {}
    const tierId = org?.branding_tier_id || ''
    const isPremiumTier = tierId.includes('whitelabel') || tierId.includes('custom')

    const canCustomizeLogo = !!tierFeatures.custom_logo || isPremiumTier
    const canCustomizeColors = !!tierFeatures.custom_colors || isPremiumTier
    const canRemoveBranding = !!tierFeatures.remove_pixy_branding || isPremiumTier

    if (!tenantSettings) return platformBranding

    const pickLogo = (tenantVal: any, platformVal: any) => tenantVal || platformVal
    const pickColor = (tenantVal: any, platformVal: any) => tenantVal || platformVal
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
        }
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
    const orgId = await getCurrentOrganizationId()
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
 * Delete Storage Asset physically from Supabase Storage to prevent garbage accumulation
 */
export async function deleteBrandingAsset(imageUrl: string) {
    if (!imageUrl || !imageUrl.includes("/storage/v1/object/public/")) {
        return { success: false, message: "URL no válida para eliminación" }
    }

    try {
        const parts = imageUrl.split("/storage/v1/object/public/")[1]?.split("/")
        if (!parts || parts.length < 2) return { success: false, message: "Ruta de archivo no válida" }

        const bucket = parts[0]
        const filePath = parts.slice(1).join("/")

        const { error } = await supabaseAdmin.storage.from(bucket).remove([filePath])
        if (error) {
            console.error("[Storage Delete Error]:", error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (err: any) {
        console.error("[Storage Delete Exception]:", err)
        return { success: false, error: err.message }
    }
}

/**
 * Update Effective Branding (Organization Level)
 */
export async function updateOrganizationBranding(settings: BrandingConfig) {
    const orgId = await (await import('@/modules/core/organizations/actions/crud')).getCurrentOrganizationId()
    if (!orgId) throw new Error("No organization context found")

    await requireOrgRole('admin')

    const supabase = await createClient()

    const { data: existing } = await supabase
        .from("organization_settings")
        .select("id")
        .eq("organization_id", orgId)
        .maybeSingle()

    const payload = {
        organization_id: orgId,
        agency_name: settings.name,
        main_logo_url: settings.logos.main,
        main_logo_light_url: settings.logos.main_light,
        portal_logo_url: settings.logos.portal,
        isotipo_url: settings.logos.favicon,
        portal_login_background_url: settings.logos.login_bg,
        portal_primary_color: settings.colors.primary,
        portal_secondary_color: settings.colors.secondary,
        agency_website: settings.website,
        agency_email: settings.email,
        agency_phone: settings.phone,
        agency_address: settings.address,
        brand_font_family: settings.font_family,
        portal_login_background_color: settings.login_bg_color,
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
        updated_at: new Date().toISOString()
    }

    let saveError: any = null
    if (existing?.id) {
        const { error } = await supabase
            .from("organization_settings")
            .update(payload)
            .eq("id", existing.id)
        saveError = error
    } else {
        const { error } = await supabase
            .from("organization_settings")
            .insert(payload)
        saveError = error
    }

    if (saveError) throw new Error(saveError.message)

    revalidatePath("/platform/adn")
    revalidatePath("/", "layout")
    return { success: true }
}
