"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { revalidatePath } from "next/cache"
import { SaasApp, AppModule } from "@/types/saas"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"

import { cache } from "react"

/**
 * Fetch all available system modules.
 * Cached to prevent hitting DB on every portfolio load.
 */
export const getSystemModules = cache(
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

        return data as AppModule[]
    }
)

/**
 * Fetch all SaaS products with their associated modules.
 */
// Re-export type from admin module for consistency

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
/**
 * Obtiene las aplicaciones (Espacios) disponibles para el Onboarding.
 * Sincronizado con metadatos del SaaS Engine (Iconos, Colores).
 */
export async function getAvailableApps() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("saas_apps")
        .select("id, name, slug, description, price_monthly, icon, color")
        .eq('is_active', true) 
        .order("sort_order", { ascending: true })

    if (error) {
        console.error("Error fetching available apps:", error)
        return []
    }

    return data
}

/**
 * Create a new SaaS Product (App) and link selected modules.
 */
export async function createSaaSProduct(productData: Partial<SaasApp>, moduleIds: string[]) {
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
        { key: 'module_whitelabel', name: 'White Labeling', description: 'Custom branding, logos, and domain settings.', category: 'addon', is_active: true },
        { key: 'core_locations', name: 'Sedes y Ubicaciones', description: 'GestiÃ³n fÃ­sica de sucursales y puntos de venta.', category: 'core', is_active: true },
        { key: 'module_attendance', name: 'Control de Asistencia', description: 'Registro de entrada y salida de personal.', category: 'addon', is_active: true },
        { key: 'module_resto_tables', name: 'GestiÃ³n de Mesas', description: 'Layout interactivo para restaurantes y servicios.', category: 'addon', is_active: true }
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

async function _getActiveModulesInternal(organizationId: string): Promise<string[]> {
    try {
        // NOTE: Using supabaseAdmin instead of createClient because
        // unstable_cache cannot use dynamic data sources like cookies()

        // 1. Get Organization Space & Overrides
        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('active_app_id, manual_module_overrides')
            .eq('id', organizationId)
            .single()

        if (orgError || !org) {
            console.error('Error fetching organization config:', orgError)
            return ['core_clients', 'core_settings']
        }

        const activeAppId = org.active_app_id
        const manualOverrides = org.manual_module_overrides as string[] || []

        // 2. Fetch Space (App) Modules
        let spaceModules: string[] = []
        if (activeAppId) {
            const { data: appModulesData, error: amError } = await supabaseAdmin
                .from('saas_app_modules')
                .select('module_key')
                .eq('app_id', activeAppId)

            if (!amError && appModulesData) {
                spaceModules = appModulesData.map(m => m.module_key)
            }
        } else {
            console.warn('Organization has no Space (App) assigned. Falling back to core.')
            spaceModules = ['core_clients', 'core_settings']
        }

        // 3. Merge & Deduplicate
        const allModules = [...spaceModules, ...manualOverrides]
        const uniqueKeys = Array.from(new Set(allModules))

        // 4. Ensure Core Modules are always present (Safety Net)
        if (!uniqueKeys.includes('core_clients')) uniqueKeys.push('core_clients')
        if (!uniqueKeys.includes('core_settings')) uniqueKeys.push('core_settings')

        return uniqueKeys

    } catch (error) {
        console.error('Unexpected error in getActiveModules:', error)
        return ['core_clients', 'core_settings']
    }
}

// Cached version with 5-minute TTL
const getCachedActiveModules = (orgId: string) => cache(
    async () => _getActiveModulesInternal(orgId)
)()

/**
 * Public API: Gets active modules with caching
 */
export async function getActiveModules(orgId?: string): Promise<string[]> {
    const organizationId = orgId || await getCurrentOrganizationId()
    if (!organizationId) {
        console.warn('No organization ID found, returning empty array')
        return []
    }
    return getCachedActiveModules(organizationId)
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

/**
 * Aggregated fetch for Sidebar to reduce network waterfalls and flickering
 * Returns everything needed to render the sidebar in one go
 */
/**
 * Aggregated fetch for Sidebar to reduce network waterfalls and flickering
 * Returns everything needed to render the sidebar in one go
 */
import { User } from "@supabase/supabase-js"
import { getCachedOrgDetails } from "@/modules/core/organizations/organization-actions"
import { getCachedUserPermissions } from "@/modules/core/settings/actions/team"

export async function getSidebarContext(orgId?: string, user?: User | null, preloadedModules?: string[]) {
    try {
        const organizationId = orgId || await getCurrentOrganizationId()
        if (!organizationId) {
            return {
                modules: ['core_clients', 'core_settings'],
                userRole: null,
                organizationType: 'client' as const,
                vertical: undefined,
                capabilities: {}
            }
        }

        // Fetch everything in parallel
        const { getCurrentBrandingTier } = await import('@/modules/core/branding/tier-actions')

        // Prepare Promises
        // 1. Modules (Use Preloaded if available, otherwise Cache)
        const modulesPromise = preloadedModules ? Promise.resolve(preloadedModules) : getActiveModules(organizationId)

        // 2. Org Details (Use Cache)
        const orgDetailsPromise = getCachedOrgDetails(organizationId)

        // 3. Branding (Keep as is for now, or cache later if needed)
        const brandingPromise = getCurrentBrandingTier()
        // Phase 10: Also fetch Visual Branding (Logo/Colors) for instant render
        const { getEffectiveBranding } = await import('@/modules/core/branding/actions')
        const visualBrandingPromise = getEffectiveBranding(organizationId)

        // 4. Permissions (Use Cache if User available)
        let permsPromise: Promise<any> | null = null
        if (user) {
            permsPromise = getCachedUserPermissions(user.id, organizationId)
        } else {
            // Fallback to slow legacy fetch if no user passed (shouldn't happen in optimized flow)
            const { getCurrentUserPermissions } = await import('@/modules/core/settings/actions/team')
            permsPromise = getCurrentUserPermissions()
        }

        const [modules, userPerms, orgDetails, brandingData, visualBranding] = await Promise.all([
            modulesPromise,
            permsPromise,
            orgDetailsPromise,
            brandingPromise,
            visualBrandingPromise
        ])

        // Resolve modern UI Capabilities (Phase 2.1)
        const { resolveOrgCapabilities } = await import("@/modules/core/organizations/space-helpers")
        const dynamicUI = await resolveOrgCapabilities(organizationId)

        return {
            modules: modules,
            userRole: userPerms?.role || null,
            userPermissions: userPerms?.permissions || null,
            organizationType: (orgDetails?.organization_type || 'client') as 'platform' | 'reseller' | 'client',
            vertical: orgDetails?.vertical_key || dynamicUI.terminology.client.toLowerCase(),
            capabilities: {
                ...(brandingData?.capabilities || {}),
                ...(userPerms?.permissions || {}),
                ...dynamicUI.capabilities.reduce((acc, cap) => ({ ...acc, [cap]: true }), {})
            },
            // Optimization Props
            branding: visualBranding,
            orgDetails: orgDetails,
            uiConfig: dynamicUI
        }

    } catch (error) {
        console.error("Error in getSidebarContext:", error)
        return {
            modules: ['core_clients', 'core_settings'],
            userRole: null,
            organizationType: 'client' as const,
            vertical: undefined,
            capabilities: {},
            branding: null,
            orgDetails: null
        }
    }
}


