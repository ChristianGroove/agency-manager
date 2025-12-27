'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/lib/actions/organizations"

/**
 * Gets the list of active module keys for the current organization
 * Uses the fallback function for safety - returns core modules if no subscription
 */
export async function getActiveModules(orgId?: string): Promise<string[]> {
    try {
        const supabase = await createClient()
        const organizationId = orgId || await getCurrentOrganizationId()

        if (!organizationId) {
            console.warn('No organization ID found, returning empty array')
            return []
        }

        // Use the safety fallback function from SQL
        const { data, error } = await supabase
            .rpc('get_org_modules_with_fallback', {
                org_id: organizationId
            })

        if (error) {
            console.error('Error fetching active modules:', error)
            // Return core modules as absolute fallback
            return ['core_clients', 'core_settings']
        }

        // data should be array of { module_key: string }
        const moduleKeys = data?.map((row: any) => row.module_key) || []

        return moduleKeys
    } catch (error) {
        console.error('Unexpected error in getActiveModules:', error)
        // Safety fallback
        return ['core_clients', 'core_settings']
    }
}

/**
 * Verifies if the current organization has access to a specific module
 */
export async function verifyModuleAccess(moduleKey: string, orgId?: string): Promise<boolean> {
    try {
        const modules = await getActiveModules(orgId)
        return modules.includes(moduleKey)
    } catch (error) {
        console.error('Error verifying module access:', error)
        // Allow access to core modules by default
        return ['core_clients', 'core_settings'].includes(moduleKey)
    }
}

/**
 * Gets detailed module information for the organization
 * Includes module metadata like name, category, icon, etc.
 */
export async function getActiveModulesDetailed(orgId?: string) {
    try {
        const supabase = await createClient()
        const organizationId = orgId || await getCurrentOrganizationId()

        if (!organizationId) {
            return []
        }

        const { data, error } = await supabase
            .from('system_modules')
            .select(`
                id,
                key,
                name,
                description,
                category,
                icon,
                saas_product_modules!inner (
                    product_id,
                    saas_products!inner (
                        id,
                        organization_saas_products!inner (
                            organization_id,
                            status
                        )
                    )
                )
            `)
            .eq('saas_product_modules.saas_products.organization_saas_products.organization_id', organizationId)
            .eq('saas_product_modules.saas_products.organization_saas_products.status', 'active')

        if (error) {
            console.error('Error fetching detailed modules:', error)
            return []
        }

        return data || []
    } catch (error) {
        console.error('Unexpected error in getActiveModulesDetailed:', error)
        return []
    }
}
