"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"
import { PortalThemeConfig, DEFAULT_PORTAL_THEME_CONFIG } from "@/modules/features/portal/theme/types"
import { getEffectiveBranding } from "@/modules/core/branding/actions"

/**
 * Obtiene la configuración actual del tema del portal para la organización activa.
 * Carga e integra los logos reales del ADN de marca del tenant.
 */
export async function getPortalThemeConfig(): Promise<PortalThemeConfig> {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()
        if (!orgId) return DEFAULT_PORTAL_THEME_CONFIG

        const [branding, { data }] = await Promise.all([
            getEffectiveBranding(orgId).catch(() => null),
            supabase
                .from("organization_settings")
                .select("*")
                .eq("organization_id", orgId)
                .maybeSingle()
        ])

        // Color de acento heredado del ADN de Marca del tenant (ej: Azul del tenant)
        const tenantBrandPrimaryColor = 
            branding?.colors?.primary || 
            data?.portal_primary_color || 
            data?.document_primary_color ||
            DEFAULT_PORTAL_THEME_CONFIG.primary_color

        const tenantName = branding?.name || data?.agency_name || 'Mi Negocio'

        // Resolver isotipo del tenant priorizando el ADN de marca real (isotipo_url) sobre los defaults del sistema
        const rawIsotype = 
            data?.isotipo_url || 
            (branding?.logos?.favicon && !branding.logos.favicon.includes('pixy') ? branding.logos.favicon : null) ||
            data?.portal_logo_url || 
            (branding?.logos?.portal && !branding.logos.portal.includes('branding/iso') ? branding.logos.portal : null) ||
            data?.main_logo_url || 
            branding?.logos?.main || 
            null

        // Logos de Marca del tenant
        const tenantLogos = {
            main_dark: data?.main_logo_url || branding?.logos?.main || null,
            main_light: data?.main_logo_light_url || branding?.logos?.main_light || data?.main_logo_url || branding?.logos?.main || null,
            portal_iso: rawIsotype,
        }

        // Leer de portal_theme_config si existe, o de portal_modules.theme_config
        const rawConfig = data?.portal_theme_config || (data?.portal_modules as any)?.theme_config

        if (!rawConfig) {
            return {
                ...DEFAULT_PORTAL_THEME_CONFIG,
                tenant_name: tenantName,
                primary_color: tenantBrandPrimaryColor,
                tenant_logos: tenantLogos,
                social_links: {
                    ...DEFAULT_PORTAL_THEME_CONFIG.social_links,
                    instagram: data?.social_instagram || undefined,
                    facebook: data?.social_facebook || undefined,
                }
            }
        }

        const parsedConfig = rawConfig as Partial<PortalThemeConfig>
        
        // Si el tema guardado no especificó un color de acento o tiene el morado default legacy (#4F46E5 / #F205E2), usar el ADN de marca real del tenant
        const effectivePrimaryColor = (parsedConfig.primary_color && parsedConfig.primary_color !== '#F205E2' && parsedConfig.primary_color !== '#4F46E5')
            ? parsedConfig.primary_color
            : tenantBrandPrimaryColor

        return {
            ...DEFAULT_PORTAL_THEME_CONFIG,
            ...parsedConfig,
            tenant_name: tenantName,
            primary_color: effectivePrimaryColor,
            tenant_logos: tenantLogos,
            social_links: {
                ...DEFAULT_PORTAL_THEME_CONFIG.social_links,
                instagram: data?.social_instagram || parsedConfig.social_links?.instagram,
                facebook: data?.social_facebook || parsedConfig.social_links?.facebook,
                ...parsedConfig.social_links
            }
        }
    } catch (err) {
        console.error("Error fetching portal theme config:", err)
        return DEFAULT_PORTAL_THEME_CONFIG
    }
}

/**
 * Guarda la configuración del tema del portal.
 * Almacena en portal_modules.theme_config para compatibilidad universal instantánea
 * y sincroniza portal_primary_color en el ADN de marca y redes sociales.
 */
export async function savePortalThemeConfig(config: PortalThemeConfig) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()
        if (!orgId) return { success: false, error: "No hay organización activa" }

        // 1. Obtener settings actuales para preservar portal_modules
        const { data: existing } = await supabase
            .from("organization_settings")
            .select("id, portal_modules")
            .eq("organization_id", orgId)
            .maybeSingle()

        const currentModules = (existing?.portal_modules as Record<string, any>) || {}
        const updatedModules = {
            ...currentModules,
            theme_config: config
        }

        // NO sobrescribir portal_primary_color con el fallback genérico (#4F46E5 o vacío).
        // Preservar siempre el color de marca real configurado en ADN del Negocio.
        const hasExplicitCustomColor = Boolean(
            config.primary_color && 
            config.primary_color.trim() !== '' && 
            config.primary_color !== '#F205E2' &&
            config.primary_color !== '#4F46E5'
        )

        const updatePayload: Record<string, any> = {
            portal_theme_config: config,
            portal_modules: updatedModules,
            social_instagram: config.social_links?.instagram || null,
            social_facebook: config.social_links?.facebook || null,
            updated_at: new Date().toISOString()
        }

        if (hasExplicitCustomColor) {
            updatePayload.portal_primary_color = config.primary_color
        }

        let { error: updateError } = await supabase
            .from("organization_settings")
            .update(updatePayload)
            .eq("organization_id", orgId)

        if (updateError) {
            // Si la columna portal_theme_config no existe en el schema actual de Postgres, guardar en portal_modules
            const fallbackPayload = { ...updatePayload }
            delete fallbackPayload.portal_theme_config

            const { error: err2 } = await supabase
                .from("organization_settings")
                .update(fallbackPayload)
                .eq("organization_id", orgId)

            if (err2) {
                console.error("Error saving portal theme config to organization_settings:", err2)
                return { success: false, error: err2.message }
            }
        }

        revalidatePath("/menu")
        revalidatePath("/portal/[token]", "page")
        revalidatePath("/portal/[token]", "layout")
        revalidatePath("/", "layout")
        return { success: true }
    } catch (err: any) {
        console.error("Error saving portal theme config:", err)
        return { success: false, error: err?.message || "Error al guardar el tema" }
    }
}
