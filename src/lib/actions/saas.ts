"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { SaaSProduct, SystemModule } from "@/types/saas"

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
        { key: 'module_catalog', name: 'Product Catalog', description: 'Public facing catalog for services and products.', category: 'addon', is_active: true }
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
