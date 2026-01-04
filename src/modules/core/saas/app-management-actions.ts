"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { requireSuperAdmin } from "@/lib/auth/platform-roles"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

// ============================================
// TYPES
// ============================================

export interface SaasApp {
    id: string
    name: string
    slug: string
    description: string
    long_description?: string
    category: string
    vertical_compatibility: string[]
    icon: string
    color: string
    banner_image_url?: string
    price_monthly: number
    trial_days: number
    is_active: boolean
    is_featured: boolean
    sort_order: number
    metadata?: Record<string, any>
}

export interface AppModule {
    id: string
    app_id: string
    module_key: string
    auto_enable: boolean
    is_core: boolean
    is_optional: boolean
    sort_order: number
}

export interface AppAddOn {
    id: string
    app_id: string
    add_on_type: string
    tier_id?: string
    is_recommended: boolean
    is_required: boolean
    discount_percent: number
    display_order: number
}

export interface AppWithDetails extends SaasApp {
    modules: AppModule[]
    recommended_add_ons: AppAddOn[]
    module_count: number
    active_org_count: number
}

// ============================================
// PUBLIC ACTIONS - App Browsing
// ============================================

/**
 * Get all active apps
 */
export async function getAllApps(): Promise<SaasApp[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('saas_apps')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('Error fetching apps:', error)
        return []
    }

    return data as SaasApp[]
}

/**
 * Get featured apps
 */
export async function getFeaturedApps(): Promise<SaasApp[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('saas_apps')
        .select('*')
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('Error fetching featured apps:', error)
        return []
    }

    return data as SaasApp[]
}

/**
 * Get app by slug with full details
 */
export async function getAppBySlug(slug: string): Promise<AppWithDetails | null> {
    const supabase = await createClient()

    // Get app
    const { data: app, error: appError } = await supabase
        .from('saas_apps')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

    if (appError || !app) {
        console.error('Error fetching app:', appError)
        return null
    }

    // Get modules
    const { data: modules } = await supabase
        .from('saas_app_modules')
        .select('*')
        .eq('app_id', app.id)
        .order('sort_order', { ascending: true })

    // Get add-ons
    const { data: addOns } = await supabase
        .from('saas_app_add_ons')
        .select('*')
        .eq('app_id', app.id)
        .order('display_order', { ascending: true })

    // Count active organizations using this app
    const { count: orgCount } = await supabase
        .from('organizations')
        .select('id', { count: 'exact', head: true })
        .eq('active_app_id', app.id)

    return {
        ...(app as SaasApp),
        modules: (modules as AppModule[]) || [],
        recommended_add_ons: (addOns as AppAddOn[]) || [],
        module_count: modules?.length || 0,
        active_org_count: orgCount || 0
    }
}

/**
 * Get apps compatible with a vertical
 */
export async function getAppsForVertical(vertical: string): Promise<SaasApp[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('saas_apps')
        .select('*')
        .eq('is_active', true)
        .or(`vertical_compatibility.cs.{"*"},vertical_compatibility.cs.{${vertical}}`)
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('Error fetching apps for vertical:', error)
        return []
    }

    return data as SaasApp[]
}

/**
 * Get current organization's active app
 */
/**
 * Get current organization's active app (Vertical)
 * BRIDGE: Maps the new Vertical System to the old "App" interface for frontend compatibility
 */
export async function getCurrentOrganizationApp() {
    const organizationId = await getCurrentOrganizationId()

    if (!organizationId) return null

    const supabase = await createClient()

    // 1. Fetch Vertical Key
    const { data: org } = await supabase
        .from('organizations')
        .select('vertical_key')
        .eq('id', organizationId)
        .single()

    if (!org || !org.vertical_key) {
        // Fallback for organizations not yet migrated
        return {
            app: {
                id: 'legacy_fallback',
                name: 'Legacy Workspace',
                slug: 'legacy',
                category: 'general',
                icon: 'Box',
                color: '#64748b'
            } as SaasApp,
            activated_at: new Date().toISOString(),
            metadata: {}
        }
    }

    // 2. Return Vertical Definition disguised as an "App"
    // This allows the existing UI to render "Agency OS" without a full rewrite
    // In future, we should rename the UI components.

    // Hardcoded definition based on seed, could be fetched from 'verticals' table
    if (org.vertical_key === 'agency') {
        return {
            app: {
                id: 'vertical_agency',
                name: 'Agency OS',
                slug: 'agency-os',
                description: 'Operating System for Marketing Agencies',
                category: 'agency',
                icon: 'Briefcase',
                color: '#ec4899', // Pink brand
                vertical_compatibility: ['agency'],
                price_monthly: 0,
                trial_days: 0,
                is_active: true,
                is_featured: true,
                sort_order: 1
            } as SaasApp,
            activated_at: new Date().toISOString(), // Todo: Fetch actual vertical assignment time if needed
            metadata: { type: 'vertical', key: 'agency' }
        }
    }

    return null
}

// ============================================
// SUPER ADMIN ACTIONS
// ============================================

/**
 * Super Admin: Get all solution templates with usage stats
 * Note: "Apps" = Solution Templates (pre-configured module bundles)
 */
export async function getAllAppsAdmin(): Promise<AppWithDetails[]> {
    await requireSuperAdmin()

    try {
        const { data: apps } = await supabaseAdmin
            .from('saas_apps')
            .select('*')
            .order('sort_order', { ascending: true })

        if (!apps) return []

        // Enrich with details
        const enriched = await Promise.all(
            apps.map(async (app) => {
                const { data: modules } = await supabaseAdmin
                    .from('saas_app_modules')
                    .select('*')
                    .eq('app_id', app.id)

                const { data: addOns } = await supabaseAdmin
                    .from('saas_app_add_ons')
                    .select('*')
                    .eq('app_id', app.id)

                const { count: orgCount } = await supabaseAdmin
                    .from('organizations')
                    .select('id', { count: 'exact', head: true })
                    .eq('active_app_id', app.id)

                return {
                    ...(app as SaasApp),
                    modules: (modules as AppModule[]) || [],
                    recommended_add_ons: (addOns as AppAddOn[]) || [],
                    module_count: modules?.length || 0,
                    active_org_count: orgCount || 0
                }
            })
        )

        return enriched
    } catch (error: any) {
        console.error('Error getting solution templates:', error)
        return []
    }
}

/**
 * Get recommended solution templates for a specific vertical
 */
export async function getTemplatesForVertical(vertical: string) {
    await requireSuperAdmin()

    try {
        const { data, error } = await supabaseAdmin
            .rpc('get_recommended_templates_for_vertical', { p_vertical: vertical })

        if (error) throw error

        return data || []
    } catch (error: any) {
        console.error('Error getting templates for vertical:', error)
        return []
    }
}

/**
 * Super Admin: Create new app
 */
export async function createApp(input: {
    name: string
    slug: string
    description: string
    category: string
    vertical_compatibility?: string[]
    icon?: string
    color?: string
    price_monthly?: number
}) {
    await requireSuperAdmin()

    try {
        const { error } = await supabaseAdmin
            .from('saas_apps')
            .insert({
                id: `app_${input.slug.replace(/-/g, '_')}`,
                name: input.name,
                slug: input.slug,
                description: input.description,
                category: input.category,
                vertical_compatibility: input.vertical_compatibility || ['*'],
                icon: input.icon || 'Package',
                color: input.color || '#6366f1',
                price_monthly: input.price_monthly || 0,
                is_active: true
            })

        if (error) throw error

        revalidatePath('/platform/admin/apps')

        return { success: true }

    } catch (error: any) {
        console.error('Error creating app:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Super Admin: Update app
 */
export async function updateApp(appId: string, updates: Partial<SaasApp>) {
    await requireSuperAdmin()

    try {
        const { error } = await supabaseAdmin
            .from('saas_apps')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', appId)

        if (error) throw error

        revalidatePath('/platform/admin/apps')

        return { success: true }

    } catch (error: any) {
        console.error('Error updating app:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Super Admin: Delete app
 */
export async function deleteApp(appId: string) {
    await requireSuperAdmin()

    try {
        // Check if any orgs are using this app
        const { count } = await supabaseAdmin
            .from('organizations')
            .select('id', { count: 'exact', head: true })
            .eq('active_app_id', appId)

        if (count && count > 0) {
            return {
                success: false,
                error: `Cannot delete app: ${count} organizations are currently using it`
            }
        }

        const { error } = await supabaseAdmin
            .from('saas_apps')
            .delete()
            .eq('id', appId)

        if (error) throw error

        revalidatePath('/platform/admin/apps')

        return { success: true }

    } catch (error: any) {
        console.error('Error deleting app:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Super Admin: Add module to app
 */
export async function addModuleToApp(input: {
    app_id: string
    module_key: string
    auto_enable?: boolean
    is_core?: boolean
    is_optional?: boolean
}) {
    await requireSuperAdmin()

    try {
        const { error } = await supabaseAdmin
            .from('saas_app_modules')
            .insert({
                app_id: input.app_id,
                module_key: input.module_key,
                auto_enable: input.auto_enable ?? true,
                is_core: input.is_core ?? false,
                is_optional: input.is_optional ?? false
            })

        if (error) throw error

        revalidatePath('/platform/admin/apps')

        return { success: true }

    } catch (error: any) {
        console.error('Error adding module to app:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Super Admin: Remove module from app
 */
export async function removeModuleFromApp(appModuleId: string) {
    await requireSuperAdmin()

    try {
        const { error } = await supabaseAdmin
            .from('saas_app_modules')
            .delete()
            .eq('id', appModuleId)

        if (error) throw error

        revalidatePath('/platform/admin/apps')

        return { success: true }

    } catch (error: any) {
        console.error('Error removing module from app:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Super Admin: Assign app to organization
 */
export async function assignAppToOrganization(input: {
    organization_id: string
    app_id: string
    enable_optional_modules?: boolean
}) {
    await requireSuperAdmin()

    try {
        const { data, error } = await supabaseAdmin
            .rpc('assign_app_to_organization', {
                p_organization_id: input.organization_id,
                p_app_id: input.app_id,
                p_enable_optional_modules: input.enable_optional_modules ?? false
            })

        if (error) throw error

        revalidatePath(`/platform/admin/organizations/${input.organization_id}`)
        revalidatePath('/platform/admin/apps')

        return {
            success: true,
            data
        }

    } catch (error: any) {
        console.error('Error assigning app:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Super Admin: Get app usage statistics
 */
export async function getAppUsageStats() {
    await requireSuperAdmin()

    const { data: apps } = await supabaseAdmin
        .from('saas_apps')
        .select('id, name')

    if (!apps) return {}

    const stats: Record<string, { count: number, organizations: string[] }> = {}

    for (const app of apps) {
        const { data: orgs } = await supabaseAdmin
            .from('organizations')
            .select('id, name')
            .eq('active_app_id', app.id)

        stats[app.id] = {
            count: orgs?.length || 0,
            organizations: orgs?.map(o => o.name) || []
        }
    }

    return stats
}
