"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { requireSuperAdmin } from "@/lib/auth/platform-roles"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

// ============================================
// TYPES
// ============================================

export interface BrandingTier {
    id: string
    name: string
    display_name: string
    price_monthly: number
    description: string
    features: Record<string, any>
    restrictions: Record<string, any>
    sort_order: number
    is_active: boolean
}

export interface OrganizationAddOn {
    id: string
    organization_id: string
    add_on_type: string
    tier_id: string | null
    price_monthly: number
    status: 'active' | 'cancelled' | 'expired' | 'suspended'
    activated_at: string
    cancelled_at: string | null
    next_billing_date: string | null
}

export interface BrandingCustomConfig {
    logo_url?: string
    favicon_url?: string
    primary_color?: string
    secondary_color?: string
    accent_color?: string
    font_family?: string
    portal_footer_text?: string
    email_signature_html?: string
    custom_css?: string
}

// ============================================
// PUBLIC ACTIONS - Available to all authenticated users
// ============================================

/**
 * Get all available branding tiers
 */
export async function getBrandingTiers(): Promise<BrandingTier[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('branding_tiers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('Error fetching branding tiers:', error)
        return []
    }

    return data as BrandingTier[]
}

/**
 * Get current organization's branding tier
 */
export async function getCurrentBrandingTier(): Promise<{
    tier: BrandingTier | null
    custom_config: BrandingCustomConfig
}> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        return { tier: null, custom_config: {} }
    }

    const { data: org } = await supabase
        .from('organizations')
        .select(`
            branding_tier_id,
            branding_custom_config,
            branding_tier:branding_tiers(*)
        `)
        .eq('id', orgId)
        .single()

    if (!org) {
        return { tier: null, custom_config: {} }
    }

    return {
        tier: (org.branding_tier as any) || null,
        custom_config: (org.branding_custom_config as BrandingCustomConfig) || {}
    }
}

/**
 * Get organization's active add-ons
 */
export async function getOrganizationAddOns(
    organizationId?: string
): Promise<OrganizationAddOn[]> {
    const supabase = await createClient()
    const orgId = organizationId || await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('organization_add_ons')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'active')

    if (error) {
        console.error('Error fetching org add-ons:', error)
        return []
    }

    return data as OrganizationAddOn[]
}

// ============================================
// SUPER ADMIN ACTIONS
// ============================================

/**
 * Super Admin: Upgrade organization's branding tier
 */
export async function upgradeBrandingTier(input: {
    organization_id: string
    new_tier_id: string
}) {
    await requireSuperAdmin()

    try {
        // Validate tier exists
        const { data: tier } = await supabaseAdmin
            .from('branding_tiers')
            .select('*')
            .eq('id', input.new_tier_id)
            .eq('is_active', true)
            .single()

        if (!tier) {
            return {
                success: false,
                error: 'Invalid or inactive tier'
            }
        }

        // Call database function to upgrade
        const { data, error } = await supabaseAdmin
            .rpc('upgrade_branding_tier', {
                p_organization_id: input.organization_id,
                p_new_tier_id: input.new_tier_id
            })

        if (error) {
            console.error('Error upgrading tier:', error)
            return {
                success: false,
                error: error.message
            }
        }

        revalidatePath(`/platform/admin/organizations/${input.organization_id}`)
        revalidatePath('/platform/admin/branding')

        return {
            success: true,
            data: data
        }

    } catch (error: any) {
        console.error('Error in upgradeBrandingTier:', error)
        return {
            success: false,
            error: error.message || 'Failed to upgrade tier'
        }
    }
}

/**
 * Super Admin: Downgrade to basic (free) tier
 */
export async function downgradeToBasicTier(organizationId: string) {
    await requireSuperAdmin()

    try {
        // Set to basic tier
        const { error: orgError } = await supabaseAdmin
            .from('organizations')
            .update({
                branding_tier_id: 'basic',
                branding_custom_config: {},
                updated_at: new Date().toISOString()
            })
            .eq('id', organizationId)

        if (orgError) throw orgError

        // Cancel branding add-on
        const { error: addonError } = await supabaseAdmin
            .from('organization_add_ons')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('organization_id', organizationId)
            .eq('add_on_type', 'branding')

        if (addonError) throw addonError

        revalidatePath(`/platform/admin/organizations/${organizationId}`)

        return { success: true }

    } catch (error: any) {
        console.error('Error downgrading tier:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Update custom branding configuration
 */
export async function updateBrandingConfig(input: {
    organization_id: string
    config: BrandingCustomConfig
}) {
    await requireSuperAdmin()

    try {
        // Get current tier to validate permissions
        const { data: org } = await supabaseAdmin
            .from('organizations')
            .select(`
                branding_tier_id,
                branding_tier:branding_tiers(features, restrictions)
            `)
            .eq('id', input.organization_id)
            .single()

        if (!org) {
            return {
                success: false,
                error: 'Organization not found'
            }
        }

        const tier = org.branding_tier as any
        const features = tier?.features || {}

        // Validate configuration against tier features
        if (input.config.logo_url && !features.custom_logo) {
            return {
                success: false,
                error: 'Custom logo not available in current tier'
            }
        }

        if (input.config.primary_color && !features.custom_colors) {
            return {
                success: false,
                error: 'Custom colors not available in current tier'
            }
        }

        if (input.config.font_family && !features.custom_fonts) {
            return {
                success: false,
                error: 'Custom fonts not available in current tier'
            }
        }

        // Update configuration
        const { error } = await supabaseAdmin
            .from('organizations')
            .update({
                branding_custom_config: input.config,
                updated_at: new Date().toISOString()
            })
            .eq('id', input.organization_id)

        if (error) throw error

        revalidatePath(`/platform/admin/organizations/${input.organization_id}`)
        revalidatePath('/platform/admin/branding')

        return { success: true, data: input.config }

    } catch (error: any) {
        console.error('Error updating branding config:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Get organization's branding tier info (admin view)
 */
export async function getOrganizationBrandingInfo(organizationId: string) {
    await requireSuperAdmin()

    const { data, error } = await supabaseAdmin
        .from('organizations')
        .select(`
            id,
            name,
            branding_tier_id,
            branding_tier_activated_at,
            branding_custom_config,
            branding_tier:branding_tiers(*),
            add_ons:organization_add_ons!organization_id(*)
        `)
        .eq('id', organizationId)
        .single()

    if (error) {
        console.error('Error fetching org branding info:', error)
        return { success: false, error: error.message }
    }

    return {
        success: true,
        data: data
    }
}

/**
 * Get all organizations with their branding tiers (for admin dashboard)
 */
export async function getAllOrganizationsBrandingStatus() {
    await requireSuperAdmin()

    const { data, error } = await supabaseAdmin
        .from('organizations')
        .select(`
            id,
            name,
            slug,
            branding_tier_id,
            branding_tier:branding_tiers(display_name, price_monthly),
            add_ons:organization_add_ons!organization_id(
                add_on_type,
                tier_id,
                price_monthly,
                status
            )
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching orgs branding status:', error)
        return []
    }

    return data || []
}

/**
 * Calculate total monthly revenue from branding add-ons
 */
export async function getBrandingRevenueMetrics() {
    await requireSuperAdmin()

    const { data, error } = await supabaseAdmin
        .from('organization_add_ons')
        .select('price_monthly, status, tier_id')
        .eq('add_on_type', 'branding')

    if (error) {
        console.error('Error fetching branding revenue:', error)
        return {
            total_monthly_revenue: 0,
            active_subscriptions: 0,
            by_tier: {}
        }
    }

    const active = data.filter(a => a.status === 'active')
    const totalRevenue = active.reduce((sum, a) => sum + Number(a.price_monthly), 0)

    const byTier = active.reduce((acc, a) => {
        const tier = a.tier_id || 'unknown'
        acc[tier] = (acc[tier] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    return {
        total_monthly_revenue: totalRevenue,
        active_subscriptions: active.length,
        by_tier: byTier
    }
}
