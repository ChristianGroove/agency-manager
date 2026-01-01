"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { requireSuperAdmin } from "@/lib/auth/platform-roles"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { moduleValidator } from "@/lib/module-validator"
import type { SystemModule, ModuleActivationPlan } from "@/lib/module-validator"

// ============================================
// PUBLIC ACTIONS - Module Information
// ============================================

/**
 * Get all system modules
 */
export async function getAllSystemModules(): Promise<SystemModule[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('system_modules')
        .select('*')
        .order('display_order', { ascending: true })

    if (error) {
        console.error('Error fetching modules:', error)
        return []
    }

    return data as SystemModule[]
}

/**
 * Get modules compatible with a vertical
 */
export async function getModulesForVertical(vertical: string): Promise<SystemModule[]> {
    return await moduleValidator.getCompatibleModulesForVertical(vertical)
}

/**
 * Get module details with dependencies
 */
export async function getModuleDetails(moduleKey: string) {
    return await moduleValidator.getModuleWithDependencies(moduleKey)
}

// ============================================
// ORGANIZATION MODULE MANAGEMENT
// ============================================

/**
 * Get activation plan for a module
 */
export async function getModuleActivationPlan(input: {
    module_key: string
    organization_id?: string
}): Promise<ModuleActivationPlan> {

    const orgId = input.organization_id || await getCurrentOrganizationId()

    if (!orgId) {
        return {
            target_module: input.module_key,
            modules_to_enable: [],
            modules_to_disable: [],
            warnings: ['No organization context found'],
            total_cost: 0
        }
    }

    // Get current active modules
    const activeModules = await getOrganizationActiveModules(orgId)

    return await moduleValidator.createActivationPlan(
        input.module_key,
        orgId,
        activeModules
    )
}

/**
 * Get deactivation plan for a module
 */
export async function getModuleDeactivationPlan(input: {
    module_key: string
    organization_id?: string
}): Promise<ModuleActivationPlan> {

    const orgId = input.organization_id || await getCurrentOrganizationId()

    if (!orgId) {
        return {
            target_module: input.module_key,
            modules_to_enable: [],
            modules_to_disable: [],
            warnings: ['No organization context found'],
            total_cost: 0
        }
    }

    const activeModules = await getOrganizationActiveModules(orgId)

    return await moduleValidator.createDeactivationPlan(
        input.module_key,
        activeModules
    )
}

/**
 * Get organization's active modules
 */
export async function getOrganizationActiveModules(organizationId?: string): Promise<string[]> {
    const orgId = organizationId || await getCurrentOrganizationId()

    if (!orgId) return []

    const { data } = await supabaseAdmin
        .from('organizations')
        .select(`
            manual_module_overrides,
            subscription_product:saas_products!subscription_product_id (
                modules:saas_product_modules (
                    system_module:system_modules!module_id (
                        key
                    )
                )
            )
        `)
        .eq('id', orgId)
        .single()

    const manualModules = (data?.manual_module_overrides as string[]) || []

    // Extract product modules
    const productModules: string[] = []
    if (data?.subscription_product && Array.isArray((data.subscription_product as any).modules)) {
        const modules = (data.subscription_product as any).modules
        modules.forEach((m: any) => {
            if (m.system_module?.key) {
                productModules.push(m.system_module.key)
            }
        })
    }

    // Always include core modules
    const coreModules = ['dashboard', 'clients', 'billing']

    // Merge unique
    return Array.from(new Set([...coreModules, ...manualModules, ...productModules]))
}

// ============================================
// SUPER ADMIN ACTIONS
// ============================================

/**
 * Super Admin: Activate module for organization with smart dependencies
 */
export async function activateModuleForOrganization(input: {
    organization_id: string
    module_key: string
    auto_enable_dependencies?: boolean
}) {
    await requireSuperAdmin()

    try {
        const { organization_id, module_key, auto_enable_dependencies = true } = input

        // Get current active modules
        const currentModules = await getOrganizationActiveModules(organization_id)

        // Get activation plan
        const plan = await moduleValidator.createActivationPlan(
            module_key,
            organization_id,
            currentModules
        )

        if (plan.warnings.length > 0 && !plan.warnings[0].includes('automatically enable')) {
            return {
                success: false,
                error: plan.warnings[0],
                plan
            }
        }

        // Determine modules to activate
        const modulesToActivate = auto_enable_dependencies
            ? plan.modules_to_enable
            : [module_key]

        // Get current manual overrides
        const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('manual_module_overrides')
            .eq('id', organization_id)
            .single()

        const currentOverrides = (org?.manual_module_overrides as string[]) || []

        // Add new modules
        const newOverrides = Array.from(new Set([...currentOverrides, ...modulesToActivate]))

        // Update organization
        const { error } = await supabaseAdmin
            .from('organizations')
            .update({
                manual_module_overrides: newOverrides,
                updated_at: new Date().toISOString()
            })
            .eq('id', organization_id)

        if (error) throw error

        revalidatePath(`/platform/admin/organizations/${organization_id}`)
        revalidatePath('/platform/admin/modules')

        return {
            success: true,
            data: {
                activated: modulesToActivate,
                plan
            }
        }

    } catch (error: any) {
        console.error('Error activating module:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Super Admin: Deactivate module for organization
 */
export async function deactivateModuleForOrganization(input: {
    organization_id: string
    module_key: string
    force?: boolean  // Force even if there are orphans
}) {
    await requireSuperAdmin()

    try {
        const { organization_id, module_key, force = false } = input

        // Get current active modules
        const currentModules = await getOrganizationActiveModules(organization_id)

        // Get deactivation plan
        const plan = await moduleValidator.createDeactivationPlan(
            module_key,
            currentModules
        )

        // Check for warnings
        if (plan.warnings.length > 0 && plan.warnings[0].includes('Cannot disable')) {
            return {
                success: false,
                error: plan.warnings[0],
                plan
            }
        }

        // Check for orphans
        if (!force && plan.modules_to_disable.length > 1) {
            return {
                success: false,
                error: plan.warnings[0] || 'This will disable dependent modules',
                plan,
                requires_confirmation: true
            }
        }

        // Get current manual overrides
        const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('manual_module_overrides')
            .eq('id', organization_id)
            .single()

        const currentOverrides = (org?.manual_module_overrides as string[]) || []

        // Remove modules
        const newOverrides = currentOverrides.filter(
            m => !plan.modules_to_disable.includes(m)
        )

        // Update organization
        const { error } = await supabaseAdmin
            .from('organizations')
            .update({
                manual_module_overrides: newOverrides,
                updated_at: new Date().toISOString()
            })
            .eq('id', organization_id)

        if (error) throw error

        revalidatePath(`/platform/admin/organizations/${organization_id}`)
        revalidatePath('/platform/admin/modules')

        return {
            success: true,
            data: {
                deactivated: plan.modules_to_disable,
                plan
            }
        }

    } catch (error: any) {
        console.error('Error deactivating module:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Super Admin: Update module metadata
 */
export async function updateModuleMetadata(input: {
    module_key: string
    updates: Partial<SystemModule>
}) {
    await requireSuperAdmin()

    try {
        const { error } = await supabaseAdmin
            .from('system_modules')
            .update({
                ...input.updates,
                updated_at: new Date().toISOString()
            })
            .eq('key', input.module_key)

        if (error) throw error

        revalidatePath('/platform/admin/modules')

        return { success: true }

    } catch (error: any) {
        console.error('Error updating module:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

/**
 * Super Admin: Get module usage statistics
 */
export async function getModuleUsageStats() {
    await requireSuperAdmin()

    const { data: orgs } = await supabaseAdmin
        .from('organizations')
        .select('id, name, manual_module_overrides')

    if (!orgs) return {}

    const stats: Record<string, { count: number, organizations: string[] }> = {}

    for (const org of orgs) {
        const modules = await getOrganizationActiveModules(org.id)

        for (const moduleKey of modules) {
            if (!stats[moduleKey]) {
                stats[moduleKey] = { count: 0, organizations: [] }
            }
            stats[moduleKey].count++
            stats[moduleKey].organizations.push(org.name)
        }
    }

    return stats
}

/**
 * Super Admin: Validate all organization modules
 */
export async function validateAllOrganizationModules(organizationId: string) {
    await requireSuperAdmin()

    try {
        const activeModules = await getOrganizationActiveModules(organizationId)
        const issues: Array<{
            module: string
            issue: string
            severity: 'error' | 'warning'
        }> = []

        for (const moduleKey of activeModules) {
            const validation = await moduleValidator.validateModuleActivation(
                moduleKey,
                organizationId,
                activeModules.filter(m => m !== moduleKey)
            )

            if (!validation.valid) {
                issues.push({
                    module: moduleKey,
                    issue: validation.error || 'Validation failed',
                    severity: 'error'
                })
            }

            if (validation.warnings && validation.warnings.length > 0) {
                issues.push({
                    module: moduleKey,
                    issue: validation.warnings.join(', '),
                    severity: 'warning'
                })
            }
        }

        return {
            success: true,
            data: {
                valid: issues.length === 0,
                issues
            }
        }

    } catch (error: any) {
        console.error('Error validating modules:', error)
        return {
            success: false,
            error: error.message
        }
    }
}
