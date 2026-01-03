"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { SaaSProduct, SystemModule } from "@/types/saas"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

import { unstable_cache } from "next/cache"

/**
 * Fetch all available system modules.
 * Cached to prevent hitting DB on every portfolio load.
 */
export const getSystemModules = unstable_cache(
    async () => {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from("system_modules")
            .select("*")
            .eq("is_active", true)
            .order("category", { ascending: false }) // Core first usually
            .order("name", { ascending: true })

        if (error) {
            console.error("Error fetching system modules:", error)
            return []
        }

        return data as SystemModule[]
    },
    ['system-modules-list'], // Cache Key
    {
        revalidate: 3600, // Revalidate every hour
        tags: ['system-modules']
    }
)

/**
 * Fetch all SaaS products with their associated modules.
 */
// Re-export type from admin module for consistency
import { SaasApp } from './app-management-actions'

/**
 * Fetch all SaaS products (Now Solution Templates from saas_apps).
 * Unified to use the same source of truth as Admin.
 */
export async function getSaaSProducts() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("saas_apps")
        .select(`*`)
        .eq('is_active', true)
        .order("sort_order", { ascending: true })

    if (error) {
        console.error("Error fetching apps:", error)
        return []
    }

    return data as SaasApp[]
}

/**
 * Create a new SaaS Product (App) and link selected modules.
 */
export async function createSaaSProduct(productData: Partial<SaaSProduct>, moduleIds: string[]) {
    try {
        // 1. Create Product
        const { data: product, error: productError } = await supabaseAdmin
            .from("saas_products")
            .insert({
                name: productData.name,
                slug: productData.slug,
                description: productData.description,
                pricing_model: productData.pricing_model,
                base_price: productData.base_price,
                status: productData.status || 'draft'
            })
            .select()
            .single()

        if (productError) throw new Error(productError.message)

        // 2. Link Modules
        if (moduleIds.length > 0) {
            const moduleLinks = moduleIds.map(moduleId => ({
                product_id: product.id,
                module_id: moduleId,
                is_default_enabled: true
            }))

            const { error: linksError } = await supabaseAdmin
                .from("saas_product_modules")
                .insert(moduleLinks)

            if (linksError) throw new Error(linksError.message)
        }

        revalidatePath("/portfolio")
        return { success: true, data: product }

    } catch (error: any) {
        console.error("Error creating SaaS Product:", error)
        return { success: false, error: error.message }
    }
}

/**
 * SEED UTILITY: Ensure system modules exist.
 * Called manually or if list is empty.
 */
export async function seedSystemModules() {
    const modules = [
        { key: 'core_clients', name: 'Client Management', description: 'CRM core functionality to manage clients and organizations.', category: 'core', is_active: true },
        { key: 'core_services', name: 'Service Contracts', description: 'Management of services, pricing, and contract terms.', category: 'core', is_active: true },
        { key: 'module_invoicing', name: 'Invoicing & Payments', description: 'Generate invoices, track payments, and manage billing.', category: 'addon', is_active: true },
        { key: 'module_briefings', name: 'Briefing System', description: 'Advanced forms and data collection wizard.', category: 'addon', is_active: true },
        { key: 'module_catalog', name: 'Product Catalog', description: 'Public facing catalog for services and products.', category: 'addon', is_active: true },
        { key: 'module_whitelabel', name: 'White Labeling', description: 'Custom branding, logos, and domain settings.', category: 'addon', is_active: true }
    ]

    const { error } = await supabaseAdmin
        .from("system_modules")
        .upsert(modules, { onConflict: 'key' })

    if (error) {
        console.error("Seed error:", error)
        return { success: false, error: error.message }
    }

    revalidatePath("/portfolio")
    return { success: true }
}

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

        // Parallelize the 3 data sources
        const [rpcResult, overridesResult, directModulesResult] = await Promise.allSettled([
            // 1. Safety Fallback (RPC)
            supabase.rpc('get_org_modules_with_fallback', { org_id: organizationId }),

            // 2. Manual Organization Overrides
            supabase
                .from('organizations')
                .select('manual_module_overrides')
                .eq('id', organizationId)
                .single(),

            // 3. Direct Table Assignments (Legacy/Compat)
            supabase
                .from('organization_modules')
                .select('module_key')
                .eq('organization_id', organizationId)
        ])

        // Process RPC Result
        let moduleKeys: string[] = []
        if (rpcResult.status === 'fulfilled' && !rpcResult.value.error) {
            moduleKeys = rpcResult.value.data?.map((row: any) => row.module_key) || []
        } else {
            // Fallback if RPC completely fails (network error, etc)
            // But usually, RPC return { data, error } structure so the promise fulfills even on logic error.
            if (rpcResult.status === 'rejected') console.error('RPC Error:', rpcResult.reason)
            else console.error('RPC Database Error:', rpcResult.value.error)

            // We continue, hoping other sources provide access or we fallback at end
        }

        // Process Overrides
        if (overridesResult.status === 'fulfilled' && !overridesResult.value.error) {
            const orgData = overridesResult.value.data
            if (orgData?.manual_module_overrides && Array.isArray(orgData.manual_module_overrides)) {
                moduleKeys = [...moduleKeys, ...orgData.manual_module_overrides]
            }
        }

        // Process Direct Assignments
        if (directModulesResult.status === 'fulfilled' && !directModulesResult.value.error) {
            const directModules = directModulesResult.value.data
            if (directModules && directModules.length > 0) {
                const directKeys = directModules.map((m: any) => m.module_key)
                moduleKeys = [...moduleKeys, ...directKeys]
            }
        }

        // Deduplicate final list
        const uniqueKeys = Array.from(new Set(moduleKeys))

        // If after all efforts we have nothing (and no explicit failures), fallback to core.
        // However, RPC 'safety fallback' usually guarantees returning defaults.
        if (uniqueKeys.length === 0) {
            return ['core_clients', 'core_settings']
        }

        return uniqueKeys

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
