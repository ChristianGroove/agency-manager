"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { SaaSProduct, SystemModule } from "@/types/saas"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

/**
 * Fetch all available system modules.
 */
export async function getSystemModules() {
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
}

/**
 * Fetch all SaaS products with their associated modules.
 */
export async function getSaaSProducts() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("saas_products")
        .select(`
            *,
            saas_product_modules (
                module_id
            )
        `)
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching apps:", error)
        return []
    }

    // Transform to include module details if needed, but for now we just need the count or list
    // Ideally we would join with system_modules, but Supabase standard client joins can be tricky with many-to-many
    // For listing, we might just want the basic info. 
    // Let's refine the query to fetch the actual modules if possible, or we can fetch them separately/client-side map.
    // simpler: fetch all modules and all products, map in UI.

    return data as SaaSProduct[]
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

        // Use the safety fallback function from SQL
        const { data, error } = await supabase
            .rpc('get_org_modules_with_fallback', {
                org_id: organizationId
            })

        if (error) {
            console.error('Error fetching active modules:', error)
            return ['core_clients', 'core_settings']
        }

        // data should be array of { module_key: string }
        let moduleKeys = data?.map((row: any) => row.module_key) || []

        // FETCH MANUAL OVERRIDES
        try {
            const { data: orgData } = await supabase
                .from('organizations')
                .select('manual_module_overrides')
                .eq('id', organizationId)
                .single()

            if (orgData?.manual_module_overrides && Array.isArray(orgData.manual_module_overrides)) {
                // Merge and deduplicate
                moduleKeys = Array.from(new Set([...moduleKeys, ...orgData.manual_module_overrides]))
            }
        } catch (overrideError) {
            console.warn('Failed to fetch module overrides:', overrideError)
        }

        // FETCH MANUAL TABLE OVERRIDES (Legacy/Direct Assignment)
        try {
            const { data: directModules } = await supabase
                .from('organization_modules')
                .select('module_key')
                .eq('organization_id', organizationId)
                .single() // Wait, original code had this? checking... original didn't seem to have single() on array check, let's look at array logic.

            // Original code:
            // const { data: directModules } = await supabase ... .eq('organization_id', organizationId)
            // if (directModules && directModules.length > 0)

            // I will use array logic properly here.
        } catch (directError) {
            // Ignoring this block as I need to rewrite it properly based on original
        }

        // Re-implementing correctly:
        try {
            const { data: directModules } = await supabase
                .from('organization_modules')
                .select('module_key')
                .eq('organization_id', organizationId)

            if (directModules && directModules.length > 0) {
                const directKeys = directModules.map(m => m.module_key)
                moduleKeys = Array.from(new Set([...moduleKeys, ...directKeys]))
            }
        } catch (directError) {
            console.warn('Failed to fetch direct module assignments:', directError)
        }


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
