/**
 * MODULE VALIDATOR SERVICE
 * Intelligent validation and dependency resolution for module activation
 */

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// ============================================
// TYPES
// ============================================

export interface ModuleDependency {
    module_key: string
    type: 'required' | 'recommended' | 'optional'
    reason: string
}

export interface SystemModule {
    id: string
    key: string
    name: string
    description: string
    category: 'core' | 'vertical_specific' | 'add_on' | 'premium'
    dependencies: ModuleDependency[]
    conflicts_with: string[]
    compatible_verticals: string[]
    icon: string
    color: string
    version: string
    is_core: boolean
    requires_configuration: boolean
    is_premium: boolean
    price_monthly: number
    display_order: number
}

export interface ValidationResult {
    valid: boolean
    error?: string
    warnings?: string[]
    conflicts?: string[]
    auto_enable_suggestions?: string[]
    type?: 'not_found' | 'incompatible_vertical' | 'module_conflict' | 'missing_dependencies' | 'orphaned_modules'
}

export interface ModuleActivationPlan {
    target_module: string
    modules_to_enable: string[]
    modules_to_disable: string[]
    warnings: string[]
    total_cost: number
}

// ============================================
// MODULE VALIDATOR CLASS
// ============================================

export class ModuleValidator {

    /**
     * Get system module by key
     */
    private async getSystemModule(moduleKey: string): Promise<SystemModule | null> {
        const { data } = await supabaseAdmin
            .from('system_modules')
            .select('*')
            .eq('key', moduleKey)
            .single()

        return data as SystemModule | null
    }

    /**
     * Get organization's vertical
     */
    private async getOrganizationVertical(organizationId: string): Promise<string | null> {
        const { data } = await supabaseAdmin
            .from('organizations')
            .select('vertical')
            .eq('id', organizationId)
            .single()

        return data?.vertical || null
    }

    /**
     * Validate if module can be activated using database function
     */
    async validateModuleActivation(
        moduleKey: string,
        organizationId: string,
        currentActiveModules: string[]
    ): Promise<ValidationResult> {

        try {
            const { data, error } = await supabaseAdmin
                .rpc('validate_module_activation', {
                    p_module_key: moduleKey,
                    p_organization_id: organizationId,
                    p_current_active_modules: currentActiveModules
                })

            if (error) {
                console.error('Validation error:', error)
                return {
                    valid: false,
                    error: error.message,
                    type: 'not_found'
                }
            }

            return data as ValidationResult

        } catch (error: any) {
            console.error('Exception in validation:', error)
            return {
                valid: false,
                error: error.message || 'Validation failed'
            }
        }
    }

    /**
     * Auto-resolve dependencies for a module using database function
     */
    async autoResolveDependencies(
        moduleKey: string,
        currentActiveModules: string[]
    ): Promise<string[]> {

        try {
            const { data, error } = await supabaseAdmin
                .rpc('auto_resolve_dependencies', {
                    p_module_key: moduleKey,
                    p_current_active_modules: currentActiveModules
                })

            if (error) {
                console.error('Auto-resolve error:', error)
                return []
            }

            return data || []

        } catch (error) {
            console.error('Exception in auto-resolve:', error)
            return []
        }
    }

    /**
     * Get modules that will be orphaned if target module is disabled
     */
    async getOrphanedModules(
        moduleKeyToDisable: string,
        currentActiveModules: string[]
    ): Promise<string[]> {

        try {
            const { data, error } = await supabaseAdmin
                .rpc('get_orphaned_modules', {
                    p_module_to_disable: moduleKeyToDisable,
                    p_current_active_modules: currentActiveModules
                })

            if (error) {
                console.error('Get orphans error:', error)
                return []
            }

            return data || []

        } catch (error) {
            console.error('Exception getting orphans:', error)
            return []
        }
    }

    /**
     * Create a comprehensive activation plan
     */
    async createActivationPlan(
        moduleKey: string,
        organizationId: string,
        currentActiveModules: string[]
    ): Promise<ModuleActivationPlan> {

        const warnings: string[] = []
        let modulesToEnable: string[] = [moduleKey]
        const modulesToDisable: string[] = []

        // 1. Validate activation
        const validation = await this.validateModuleActivation(
            moduleKey,
            organizationId,
            currentActiveModules
        )

        if (!validation.valid) {
            return {
                target_module: moduleKey,
                modules_to_enable: [],
                modules_to_disable: [],
                warnings: [validation.error || 'Cannot activate module'],
                total_cost: 0
            }
        }

        // 2. Auto-resolve dependencies
        const dependencies = await this.autoResolveDependencies(
            moduleKey,
            currentActiveModules
        )

        modulesToEnable = [...modulesToEnable, ...dependencies]

        if (dependencies.length > 0) {
            warnings.push(`Will automatically enable ${dependencies.length} required dependencies`)
        }

        // 3. Check for conflicts in dependencies
        for (const dep of dependencies) {
            const depValidation = await this.validateModuleActivation(
                dep,
                organizationId,
                currentActiveModules
            )

            if (depValidation.conflicts && depValidation.conflicts.length > 0) {
                warnings.push(`Dependency "${dep}" conflicts with: ${depValidation.conflicts.join(', ')}`)
            }
        }

        // 4. Calculate total cost
        const { data: modules } = await supabaseAdmin
            .from('system_modules')
            .select('key, price_monthly')
            .in('key', modulesToEnable)
            .eq('is_premium', true)

        const totalCost = modules?.reduce((sum, m) => sum + Number(m.price_monthly), 0) || 0

        return {
            target_module: moduleKey,
            modules_to_enable: modulesToEnable.filter((m, i, arr) => arr.indexOf(m) === i),
            modules_to_disable: modulesToDisable,
            warnings,
            total_cost: totalCost
        }
    }

    /**
     * Create a comprehensive deactivation plan
     */
    async createDeactivationPlan(
        moduleKey: string,
        currentActiveModules: string[]
    ): Promise<ModuleActivationPlan> {

        const warnings: string[] = []
        const modulesToDisable: string[] = [moduleKey]

        // Get orphaned modules
        const orphans = await this.getOrphanedModules(
            moduleKey,
            currentActiveModules
        )

        modulesToDisable.push(...orphans)

        if (orphans.length > 0) {
            warnings.push(
                `Disabling this module will also disable ${orphans.length} dependent modules: ${orphans.join(', ')}`
            )
        }

        // Check if trying to disable core module
        const module = await this.getSystemModule(moduleKey)
        if (module?.is_core) {
            return {
                target_module: moduleKey,
                modules_to_enable: [],
                modules_to_disable: [],
                warnings: ['Cannot disable core module'],
                total_cost: 0
            }
        }

        return {
            target_module: moduleKey,
            modules_to_enable: [],
            modules_to_disable: modulesToDisable.filter((m, i, arr) => arr.indexOf(m) === i),
            warnings,
            total_cost: 0
        }
    }

    /**
     * Get compatible modules for a vertical
     */
    async getCompatibleModulesForVertical(vertical: string): Promise<SystemModule[]> {
        const { data } = await supabaseAdmin
            .from('system_modules')
            .select('*')
            .or(`compatible_verticals.cs.{"*"},compatible_verticals.cs.{${vertical}}`)
            .order('display_order', { ascending: true })

        return (data as SystemModule[]) || []
    }

    /**
     * Get module details with dependency metadata
     */
    async getModuleWithDependencies(moduleKey: string): Promise<{
        module: SystemModule | null
        required_dependencies: SystemModule[]
        recommended_dependencies: SystemModule[]
        conflicts: SystemModule[]
    }> {

        const module = await this.getSystemModule(moduleKey)

        if (!module) {
            return {
                module: null,
                required_dependencies: [],
                recommended_dependencies: [],
                conflicts: []
            }
        }

        // Get required dependencies
        const requiredKeys = module.dependencies
            .filter(d => d.type === 'required')
            .map(d => d.module_key)

        const { data: requiredDeps } = await supabaseAdmin
            .from('system_modules')
            .select('*')
            .in('key', requiredKeys)

        // Get recommended dependencies
        const recommendedKeys = module.dependencies
            .filter(d => d.type === 'recommended')
            .map(d => d.module_key)

        const { data: recommendedDeps } = await supabaseAdmin
            .from('system_modules')
            .select('*')
            .in('key', recommendedKeys)

        // Get conflicts
        const { data: conflicts } = await supabaseAdmin
            .from('system_modules')
            .select('*')
            .in('key', module.conflicts_with || [])

        return {
            module,
            required_dependencies: (requiredDeps as SystemModule[]) || [],
            recommended_dependencies: (recommendedDeps as SystemModule[]) || [],
            conflicts: (conflicts as SystemModule[]) || []
        }
    }
}

// Export singleton instance
export const moduleValidator = new ModuleValidator()
