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
 * Fetch available Apps (Verticals) for Onboarding.
 * Fetches from saas_products which is the table linked by active_app_id.
 */
export async function getAvailableApps() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("saas_apps")
        .select("id, name, slug, description, price_monthly")
        .eq('is_active', true) // 'status' might not exist on saas_apps, migration says 'is_active'
        .order("sort_order", { ascending: true }) // Use sort_order for better control

    if (error) {
        console.error("Error fetching available apps:", error)
        return []
    }

    return data
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
                name: (productData as any).name,
                slug: (productData as any).slug,
                description: (productData as any).description,
                pricing_model: (productData as any).pricing_model,
                price_monthly: (productData as any).base_price,
                status: (productData as any).status || 'draft'
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
/**
 * Gets the list of active module keys for the current organization
 * Uses the strict Verticals Architecture (with manual overrides fallback)
 */
export async function getActiveModules(orgId?: string): Promise<string[]> {
    try {
        const supabase = await createClient()
        const organizationId = orgId || await getCurrentOrganizationId()

        if (!organizationId) {
            console.warn('No organization ID found, returning empty array')
            return []
        }

        // 1. Get Organization Vertical & Overrides
        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('vertical_key, manual_module_overrides')
            .eq('id', organizationId)
            .single()

        if (orgError || !org) {
            console.error('Error fetching organization config:', orgError)
            // Fallback to core if org fetch fails
            return ['core_clients', 'core_settings']
        }

        const verticalKey = org.vertical_key
        const manualOverrides = org.manual_module_overrides as string[] || []

        // 2. Fetch Vertical Modules
        let verticalModules: string[] = []
        if (verticalKey) {
            const { data: vModules, error: vmError } = await supabase
                .from('vertical_modules')
                .select('module_key')
                .eq('vertical_key', verticalKey)

            if (!vmError && vModules) {
                verticalModules = vModules.map(m => m.module_key)
            }
        } else {
            // Legacy/No-Vertical fallback: Check manual assignments or return basic set
            // For transition period, we might want to default to 'agency' modules if no vertical set?
            // But migration should have set it.
            console.warn('Organization has no vertical assigned. Falling back to core.')
            verticalModules = ['core_clients', 'core_settings']
        }

        // 3. Merge & Deduplicate
        const allModules = [...verticalModules, ...manualOverrides]
        const uniqueKeys = Array.from(new Set(allModules))

        // 4. Ensure Core Modules are always present (Safety Net)
        if (!uniqueKeys.includes('core_clients')) uniqueKeys.push('core_clients')
        if (!uniqueKeys.includes('core_settings')) uniqueKeys.push('core_settings')

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

        // Reuse the single source of truth logic
        const activeKeys = await getActiveModules(organizationId)

        if (activeKeys.length === 0) return []

        // Fetch details for these keys
        const { data, error } = await supabase
            .from('system_modules')
            .select(`
                id,
                key,
                name,
                description,
                category,
                icon
            `)
            .in('key', activeKeys)
            .eq('is_active', true)
            .order('category', { ascending: false })
            .order('name')

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
