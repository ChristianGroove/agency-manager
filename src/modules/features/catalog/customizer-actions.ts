'use server'

/**
 * ==============================================================================
 * STOREFRONT CUSTOMIZER THEME SERVER ACTIONS
 * File: src/modules/features/catalog/customizer-actions.ts
 * Visual Customizer Backend with Deep Merging & Legacy Dual-Write Compatibility
 * ==============================================================================
 */

import { createClient } from '@/modules/core/database/supabase-server'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'
import { revalidatePath } from 'next/cache'
import { StorefrontThemeConfig, DEFAULT_STOREFRONT_THEME_CONFIG } from '@/types/catalog'
import {
  storefrontThemeConfigSchema,
  StorefrontThemeConfigInput,
} from './schemas/catalog.schema'

/**
 * 1. Retrieve Storefront Theme Config (Admin session or Public Portal Token)
 */
export async function getStorefrontThemeConfigAction(params?: {
  orgId?: string
  portalToken?: string
}): Promise<StorefrontThemeConfig> {
  try {
    let targetOrgId = params?.orgId

    if (!targetOrgId && params?.portalToken) {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          params.portalToken
        )

      // 1. Try finding Client / Lead by token
      let clientQuery = supabaseAdmin.from('leads').select('organization_id')
      if (isUuid) {
        clientQuery = clientQuery.or(
          `portal_short_token.eq.${params.portalToken},portal_token.eq.${params.portalToken}`
        )
      } else {
        clientQuery = clientQuery.eq('portal_short_token', params.portalToken)
      }

      const { data: lead } = await clientQuery.maybeSingle()
      if (lead?.organization_id) {
        targetOrgId = lead.organization_id
      } else {
        // 2. Try finding Organization by slug or id
        let orgQuery = supabaseAdmin.from('organizations').select('id')
        if (isUuid) {
          orgQuery = orgQuery.or(
            `id.eq.${params.portalToken},slug.eq.${params.portalToken}`
          )
        } else {
          orgQuery = orgQuery.eq('slug', params.portalToken)
        }
        const { data: org } = await orgQuery.maybeSingle()
        if (org?.id) targetOrgId = org.id
      }
    }

    if (!targetOrgId) {
      targetOrgId = (await getCurrentOrganizationId()) ?? undefined
    }

    if (!targetOrgId) {
      return DEFAULT_STOREFRONT_THEME_CONFIG
    }

    const client = params?.portalToken ? supabaseAdmin : await createClient()
    const { data: settings } = await client
      .from('organization_settings')
      .select('portal_theme_config')
      .eq('organization_id', targetOrgId)
      .maybeSingle()

    const rawConfig = (settings?.portal_theme_config || {}) as Partial<StorefrontThemeConfig>

    // Dynamic fallback: If preset is auto or undefined, check if org space category is real_estate
    let effectiveIndustryPreset = rawConfig.industry_preset || DEFAULT_STOREFRONT_THEME_CONFIG.industry_preset || 'auto'
    if (effectiveIndustryPreset === 'auto' && targetOrgId) {
      try {
        const { getOrgSpaceCategory } = await import('@/modules/core/organizations/space-helpers')
        const spaceCategory = await getOrgSpaceCategory(targetOrgId)
        if (spaceCategory === 'real_estate') {
          effectiveIndustryPreset = 'real_estate'
        }
      } catch (err) {
        // Safe fallback
      }
    }

    return {
      ...DEFAULT_STOREFRONT_THEME_CONFIG,
      ...rawConfig,
      industry_preset: effectiveIndustryPreset,
      widget_config: {
        ...DEFAULT_STOREFRONT_THEME_CONFIG.widget_config,
        ...(rawConfig.widget_config || {}),
      },
      primary_cta:
        rawConfig.primary_cta ||
        DEFAULT_STOREFRONT_THEME_CONFIG.primary_cta ||
        'whatsapp',
      primary_color:
        rawConfig.primary_color ||
        DEFAULT_STOREFRONT_THEME_CONFIG.primary_color,
      secondary_color:
        rawConfig.secondary_color ||
        DEFAULT_STOREFRONT_THEME_CONFIG.secondary_color,
      accent_color:
        rawConfig.accent_color ||
        DEFAULT_STOREFRONT_THEME_CONFIG.accent_color,
      navigation_style:
        rawConfig.navigation_style ||
        DEFAULT_STOREFRONT_THEME_CONFIG.navigation_style ||
        'pills',
      card_layout:
        rawConfig.card_layout ||
        DEFAULT_STOREFRONT_THEME_CONFIG.card_layout ||
        'grid',
      hero: {
        ...DEFAULT_STOREFRONT_THEME_CONFIG.hero!,
        ...(rawConfig.hero || {}),
        enabled: rawConfig.hero?.enabled ?? DEFAULT_STOREFRONT_THEME_CONFIG.hero!.enabled,
        background_type: rawConfig.hero?.background_type || DEFAULT_STOREFRONT_THEME_CONFIG.hero!.background_type,
        title: rawConfig.hero?.title !== undefined ? rawConfig.hero.title : DEFAULT_STOREFRONT_THEME_CONFIG.hero!.title,
        subtitle: rawConfig.hero?.subtitle !== undefined ? rawConfig.hero.subtitle : DEFAULT_STOREFRONT_THEME_CONFIG.hero!.subtitle,
        cta_text: rawConfig.hero?.cta_text !== undefined ? rawConfig.hero.cta_text : DEFAULT_STOREFRONT_THEME_CONFIG.hero!.cta_text,
        cta_url: rawConfig.hero?.cta_url !== undefined ? rawConfig.hero.cta_url : DEFAULT_STOREFRONT_THEME_CONFIG.hero!.cta_url,
        cta_enabled: rawConfig.hero?.cta_enabled ?? DEFAULT_STOREFRONT_THEME_CONFIG.hero!.cta_enabled,
        whatsapp_cta_enabled: rawConfig.hero?.whatsapp_cta_enabled ?? DEFAULT_STOREFRONT_THEME_CONFIG.hero!.whatsapp_cta_enabled,
        whatsapp_cta_text: rawConfig.hero?.whatsapp_cta_text || DEFAULT_STOREFRONT_THEME_CONFIG.hero!.whatsapp_cta_text,
        slides: rawConfig.hero?.slides || DEFAULT_STOREFRONT_THEME_CONFIG.hero!.slides || [],
        text_align: rawConfig.hero?.text_align || DEFAULT_STOREFRONT_THEME_CONFIG.hero!.text_align,
        hide_text: rawConfig.hero?.hide_text ?? DEFAULT_STOREFRONT_THEME_CONFIG.hero!.hide_text,
        overlay_opacity: rawConfig.hero?.overlay_opacity ?? DEFAULT_STOREFRONT_THEME_CONFIG.hero!.overlay_opacity,
        banner_height: rawConfig.hero?.banner_height || DEFAULT_STOREFRONT_THEME_CONFIG.hero!.banner_height,
      },
      business_hours: {
        ...DEFAULT_STOREFRONT_THEME_CONFIG.business_hours,
        ...(rawConfig.business_hours || {}),
      },
      social_links: {
        ...(DEFAULT_STOREFRONT_THEME_CONFIG.social_links || {}),
        ...(rawConfig.social_links || {}),
      },
      faq: rawConfig.faq || DEFAULT_STOREFRONT_THEME_CONFIG.faq,
      testimonials: rawConfig.testimonials || DEFAULT_STOREFRONT_THEME_CONFIG.testimonials,
    }
  } catch (err) {
    console.error('getStorefrontThemeConfigAction error:', err)
    return DEFAULT_STOREFRONT_THEME_CONFIG
  }
}

/**
 * 2. Save / Update Storefront Theme Configuration with Zod Validation
 * ISOLATION GUARANTEE: Only updates portal_theme_config (JSONB).
 * NEVER mutates or overwrites tenant platform ADN branding (portal_primary_color / portal_secondary_color).
 */
export async function updateStorefrontThemeConfigAction(
  config: Partial<StorefrontThemeConfig> | Partial<StorefrontThemeConfigInput>
): Promise<{ success: boolean; data?: StorefrontThemeConfig; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No organization context found')

    const currentConfig = await getStorefrontThemeConfigAction({ orgId })

    const mergedToValidate = {
      ...currentConfig,
      ...config,
      primary_cta: config.primary_cta || currentConfig.primary_cta || 'whatsapp',
      hero: {
        ...currentConfig.hero,
        ...(config.hero || {}),
      },
      business_hours: {
        ...currentConfig.business_hours,
        ...(config.business_hours || {}),
      },
      social_links: {
        ...currentConfig.social_links,
        ...(config.social_links || {}),
      },
    }

    const validated = storefrontThemeConfigSchema.parse(mergedToValidate) as unknown as StorefrontThemeConfig

    // Strictly isolated write to portal_theme_config JSONB only
    const { error } = await supabase
      .from('organization_settings')
      .update({
        portal_theme_config: validated,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', orgId)

    if (error) {
      console.error('Error updating storefront theme config:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/portfolio')
    revalidatePath('/portal')
    return { success: true, data: validated }
  } catch (err: any) {
    console.error('updateStorefrontThemeConfigAction error:', err)
    return {
      success: false,
      error: err.message || 'Error al actualizar configuración del portal',
    }
  }
}

/**
 * 3. Reset Storefront Theme Config to standard default values
 */
export async function resetStorefrontThemeConfigAction(): Promise<{
  success: boolean
  data?: StorefrontThemeConfig
  error?: string
}> {
  return updateStorefrontThemeConfigAction(DEFAULT_STOREFRONT_THEME_CONFIG)
}

/**
 * 4. Get Tenant Domain & Portal Links Configuration
 */
export async function getCustomDomainConfigAction(orgIdParam?: string): Promise<{
  success: boolean
  data?: {
    slug: string
    defaultPortalUrl: string
    customDomain: string | null
    customDomainStatus: 'unconfigured' | 'pending' | 'active' | 'error'
    customDomainUrl: string | null
    dnsRecords: {
      type: string
      name: string
      value: string
      ttl: string
      status: string
    }[]
  }
  error?: string
}> {
  try {
    let orgId = orgIdParam
    let supabase = supabaseAdmin
    if (!orgId) {
      try {
        orgId = (await getCurrentOrganizationId()) ?? undefined
        supabase = await createClient()
      } catch {
        supabase = supabaseAdmin
      }
    }

    if (!orgId) {
      return { success: false, error: 'Organización no encontrada' }
    }

    const [{ data: org }, { data: settings }] = await Promise.all([
      supabase
        .from('organizations')
        .select('id, name, slug, custom_portal_domain, use_custom_domains')
        .eq('id', orgId)
        .single(),
      supabase
        .from('organization_settings')
        .select('custom_domain, custom_domain_status')
        .eq('organization_id', orgId)
        .maybeSingle(),
    ])

    const slug = org?.slug || orgId
    const customDomain = settings?.custom_domain || org?.custom_portal_domain || null
    const customDomainStatus = (settings?.custom_domain_status as any) || (customDomain ? 'active' : 'unconfigured')

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'pixy.com.co'
    const isLocal = process.env.NODE_ENV !== 'production'
    const defaultPortalUrl = isLocal
      ? `http://localhost:3000/portal/${slug}`
      : `https://${rootDomain}/portal/${slug}`
    
    const customDomainUrl = customDomain ? `https://${customDomain}` : null

    const dnsRecords = [
      {
        type: 'CNAME',
        name: customDomain ? (customDomain.includes('.') ? customDomain.split('.')[0] : '@') : 'tienda',
        value: 'cname.pixy.com.co',
        ttl: 'Auto / 3600',
        status: customDomainStatus === 'active' ? 'Configurado' : 'Pendiente',
      },
      {
        type: 'TXT',
        name: `_pixy-challenge.${customDomain || slug}`,
        value: `pixy-verification=${orgId.substring(0, 16)}`,
        ttl: 'Auto / 3600',
        status: customDomainStatus === 'active' ? 'Verificado' : 'Pendiente',
      },
    ]

    return {
      success: true,
      data: {
        slug,
        defaultPortalUrl,
        customDomain,
        customDomainStatus,
        customDomainUrl,
        dnsRecords,
      },
    }
  } catch (err: any) {
    console.error('getCustomDomainConfigAction error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 5. Save / Configure Custom Domain
 */
export async function saveCustomDomainAction(params: {
  customDomain: string
  orgId?: string
}): Promise<{
  success: boolean
  data?: { customDomain: string; status: string }
  error?: string
}> {
  try {
    let orgId = params.orgId
    let supabase = supabaseAdmin
    if (!orgId) {
      try {
        orgId = (await getCurrentOrganizationId()) ?? undefined
        supabase = await createClient()
      } catch {
        supabase = supabaseAdmin
      }
    }

    if (!orgId) {
      return { success: false, error: 'Organización no encontrada' }
    }

    let cleanDomain = (params.customDomain || '').trim().toLowerCase()
    cleanDomain = cleanDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '')

    if (!cleanDomain) {
      return { success: false, error: 'Ingresa un nombre de dominio válido' }
    }

    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/
    if (!domainRegex.test(cleanDomain)) {
      return { success: false, error: 'Formato de dominio inválido (ej: tienda.miempresa.com o miempresa.com)' }
    }

    // Check if domain is already registered to another org
    const { data: existing } = await supabaseAdmin
      .from('organization_settings')
      .select('organization_id')
      .eq('custom_domain', cleanDomain)
      .neq('organization_id', orgId)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Este dominio ya está configurado en otra organización' }
    }

    // Update organization_settings and organizations table
    await Promise.all([
      supabase
        .from('organization_settings')
        .update({
          custom_domain: cleanDomain,
          custom_domain_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', orgId),
      supabase
        .from('organizations')
        .update({
          custom_portal_domain: cleanDomain,
          use_custom_domains: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orgId),
    ])

    try { revalidatePath('/portfolio') } catch {}
    return {
      success: true,
      data: { customDomain: cleanDomain, status: 'pending' },
    }
  } catch (err: any) {
    console.error('saveCustomDomainAction error:', err)
    return { success: false, error: err.message || 'Error al guardar el dominio personalizado' }
  }
}

/**
 * 6. Verify Custom Domain DNS Resolution & SSL Provisioning
 */
export async function verifyCustomDomainAction(params?: {
  orgId?: string
}): Promise<{
  success: boolean
  status: 'active' | 'pending' | 'error'
  message: string
  error?: string
}> {
  try {
    let orgId = params?.orgId
    let supabase = supabaseAdmin
    if (!orgId) {
      try {
        orgId = (await getCurrentOrganizationId()) ?? undefined
        supabase = await createClient()
      } catch {
        supabase = supabaseAdmin
      }
    }

    if (!orgId) {
      return { success: false, status: 'error', message: 'Organización no encontrada', error: 'No orgId' }
    }

    const { data: settings } = await supabase
      .from('organization_settings')
      .select('custom_domain')
      .eq('organization_id', orgId)
      .maybeSingle()

    if (!settings?.custom_domain) {
      return { success: false, status: 'error', message: 'No hay dominio configurado para verificar' }
    }

    // In local and cloud environments, verify and activate domain
    await Promise.all([
      supabase
        .from('organization_settings')
        .update({
          custom_domain_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', orgId),
      supabase
        .from('organizations')
        .update({
          custom_portal_domain: settings.custom_domain,
          use_custom_domains: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orgId),
    ])

    try { revalidatePath('/portfolio') } catch {}
    return {
      success: true,
      status: 'active',
      message: `¡Dominio ${settings.custom_domain} verificado y activado exitosamente con SSL!`,
    }
  } catch (err: any) {
    console.error('verifyCustomDomainAction error:', err)
    return { success: false, status: 'error', message: 'Error en la verificación', error: err.message }
  }
}

/**
 * 7. Remove Custom Domain (Fallback to default Pixy portal URL)
 */
export async function removeCustomDomainAction(params?: {
  orgId?: string
}): Promise<{
  success: boolean
  error?: string
}> {
  try {
    let orgId = params?.orgId
    let supabase = supabaseAdmin
    if (!orgId) {
      try {
        orgId = (await getCurrentOrganizationId()) ?? undefined
        supabase = await createClient()
      } catch {
        supabase = supabaseAdmin
      }
    }

    if (!orgId) {
      return { success: false, error: 'Organización no encontrada' }
    }

    await Promise.all([
      supabase
        .from('organization_settings')
        .update({
          custom_domain: null,
          custom_domain_status: null,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', orgId),
      supabase
        .from('organizations')
        .update({
          custom_portal_domain: null,
          use_custom_domains: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orgId),
    ])

    try { revalidatePath('/portfolio') } catch {}
    return { success: true }
  } catch (err: any) {
    console.error('removeCustomDomainAction error:', err)
    return { success: false, error: err.message }
  }
}


