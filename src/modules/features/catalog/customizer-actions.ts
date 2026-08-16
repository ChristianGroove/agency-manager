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
import { StorefrontThemeConfig } from '@/types/catalog'
import {
  storefrontThemeConfigSchema,
  StorefrontThemeConfigInput,
} from './schemas/catalog.schema'

export const DEFAULT_STOREFRONT_THEME_CONFIG: StorefrontThemeConfig = {
  theme: 'modern',
  primary_color: '#4F46E5',
  secondary_color: '#EC4899',
  accent_color: '#10B981',
  color_mode: 'auto',
  background_style: 'solid',
  hero: {
    enabled: true,
    title: 'Descubre Nuestras Soluciones',
    subtitle: 'Calidad superior, innovación y servicio personalizado.',
    cta_text: 'Explorar Catálogo',
    cta_url: '#catalog',
    bg_gradient: 'from-indigo-900 via-slate-900 to-black',
    badge_text: 'Portafolio 2026',
  },
  navigation_style: 'pills',
  card_layout: 'grid',
  enable_search: true,
  enable_whatsapp_checkout: true,
  enable_quote_request: true,
  enable_qr_code: true,
  faq: [],
  testimonials: [],
  social_links: {},
  business_hours: {
    monday_friday: '08:00 - 18:00',
    saturday: '09:00 - 14:00',
    sunday: 'Cerrado',
  },
}

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
      .select('portal_theme_config, portal_primary_color, portal_secondary_color')
      .eq('organization_id', targetOrgId)
      .maybeSingle()

    const rawConfig = (settings?.portal_theme_config || {}) as Partial<StorefrontThemeConfig>

    return {
      ...DEFAULT_STOREFRONT_THEME_CONFIG,
      ...rawConfig,
      primary_color:
        rawConfig.primary_color ||
        settings?.portal_primary_color ||
        DEFAULT_STOREFRONT_THEME_CONFIG.primary_color,
      secondary_color:
        rawConfig.secondary_color ||
        settings?.portal_secondary_color ||
        DEFAULT_STOREFRONT_THEME_CONFIG.secondary_color,
      hero: {
        ...DEFAULT_STOREFRONT_THEME_CONFIG.hero,
        ...(rawConfig.hero || {}),
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
 */
export async function updateStorefrontThemeConfigAction(
  config: Partial<StorefrontThemeConfigInput>
): Promise<{ success: boolean; data?: StorefrontThemeConfig; error?: string }> {
  try {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No organization context found')

    const currentConfig = await getStorefrontThemeConfigAction({ orgId })

    const mergedToValidate = {
      ...currentConfig,
      ...config,
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

    const validated = storefrontThemeConfigSchema.parse(mergedToValidate)

    const { error } = await supabase
      .from('organization_settings')
      .update({
        portal_theme_config: validated,
        portal_primary_color: validated.primary_color,
        portal_secondary_color: validated.secondary_color,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', orgId)

    if (error) {
      console.error('Error updating storefront theme config:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/portfolio')
    revalidatePath('/portal')
    revalidatePath('/services')
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
