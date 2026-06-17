"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { revalidatePath, revalidateTag } from "next/cache"
import { requireSuperAdmin } from "@/modules/core/iam/services/platform-roles"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { SaasApp, AppModule, AppAddOn, AppWithDetails } from "@/types/saas"
import { moduleValidator } from "@/modules/core/saas/module-validator"

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
// getCurrentOrganizationApp has been moved to app-data-actions.ts for lightweight UI access

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
        const { data: apps } = await (await createClient())
            .from('saas_apps')
            .select('*')
            .order('sort_order', { ascending: true })

        if (!apps) return []

        // Enrich with details
        const enriched = await Promise.all(
            apps.map(async (app) => {
                const { data: modules } = await (await createClient())
                    .from('saas_app_modules')
                    .select('*')
                    .eq('app_id', app.id)

                const { data: addOns } = await (await createClient())
                    .from('saas_app_add_ons')
                    .select('*')
                    .eq('app_id', app.id)

                const { count: orgCount } = await (await createClient())
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
        const { data, error } = await (await createClient())
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
    space_category?: string
}) {
    await requireSuperAdmin()

    try {
        const { error } = await (await createClient())
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
                space_category: input.space_category || 'agency',
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
        const { error } = await (await createClient())
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
        const { count } = await (await createClient())
            .from('organizations')
            .select('id', { count: 'exact', head: true })
            .eq('active_app_id', appId)

        if (count && count > 0) {
            return {
                success: false,
                error: `Cannot delete app: ${count} organizations are currently using it`
            }
        }

        const { error } = await (await createClient())
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
        const { error } = await (await createClient())
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
        // @ts-ignore
        revalidateTag('org-modules') // Purge tenant caches to show new module instantly

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
        // 1. Get the module context
        const { data: moduleToDelete } = await (await createClient())
            .from('saas_app_modules')
            .select('app_id, module_key')
            .eq('id', appModuleId)
            .single()

        if (!moduleToDelete) throw new Error("MÃ³dulo de Space no encontrado")

        // 2. Get all modules currently in this app
        const { data: appModules } = await (await createClient())
            .from('saas_app_modules')
            .select('module_key')
            .eq('app_id', moduleToDelete.app_id)

        const activeModules = appModules?.map(m => m.module_key) || []

        // 3. Validate deactivation
        const plan = await moduleValidator.createDeactivationPlan(
            moduleToDelete.module_key,
            activeModules
        )

        if (plan.modules_to_disable.length > 1) {
            const dependents = plan.modules_to_disable.filter(m => m !== moduleToDelete.module_key)
            return {
                success: false,
                error: `No puedes desactivar este mÃ³dulo. Otros mÃ³dulos activos de este Space dependen de Ã©l: ${dependents.join(', ')}. DesactÃ­valos primero.`
            }
        }

        // 4. Proceed with deletion
        const { error } = await (await createClient())
            .from('saas_app_modules')
            .delete()
            .eq('id', appModuleId)

        if (error) throw error

        revalidatePath('/platform/admin/apps')
        // @ts-ignore
        revalidateTag('org-modules') // Purge tenant caches to apply removal instantly

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
        const { data, error } = await (await createClient())
            .rpc('assign_app_to_organization', {
                p_organization_id: input.organization_id,
                p_app_id: input.app_id,
                p_enable_optional_modules: input.enable_optional_modules ?? false
            })

        if (error) throw error

        revalidatePath(`/platform/admin/organizations/${input.organization_id}`)
        revalidatePath('/platform/admin/apps')
        // @ts-ignore
        revalidateTag('org-modules') // Purge tenant specific cache to ensure correct modules

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

    const { data: apps } = await (await createClient())
        .from('saas_apps')
        .select('id, name')

    if (!apps) return {}

    const stats: Record<string, { count: number, organizations: string[] }> = {}

    for (const app of apps) {
        const { data: orgs } = await (await createClient())
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

/**
 * Super Admin: Update App UI Configuration (Terminology & Capabilities)
 */
import { DynamicSpaceConfig } from "@/modules/core/organizations/capabilities-registry"

export async function updateAppUIConfig(appId: string, config: DynamicSpaceConfig) {
    await requireSuperAdmin()

    try {
        const { error } = await (await createClient())
            .from('saas_apps')
            .update({
                ui_config: config as any,
                updated_at: new Date().toISOString()
            })
            .eq('id', appId)

        if (error) throw error

        // Purge caches
        revalidatePath('/platform/admin/apps')
        revalidatePath(`/platform/admin/apps/${appId}`)
        // @ts-ignore
        revalidateTag('org-modules')

        return { success: true }

    } catch (error: any) {
        console.error('Error updating app UI config:', error)
        return {
            success: false,
            error: error.message
        }
    }
}
