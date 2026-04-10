'use server'

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"
import { ServiceCatalogItem } from "@/types"
import { getCurrentOrganizationApp } from "@/modules/core/saas/app-data-actions"
import { SaasApp } from "@/types/saas"

// ... existing code ...

export async function getSubscriptionApp() {
    // Delegate to the robust logic in saas/app-management-actions
    const currentApp = await getCurrentOrganizationApp()

    if (currentApp?.app) {
        return currentApp.app
    }

    // Fallback: Check direct DB link if the above failed (though getCurrentOrganizationApp should cover it if extended properly)
    // For now we trust getCurrentOrganizationApp as the source of truth for "Plan"
    return null
}

export async function getCatalogItem(id: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return null

    const { data, error } = await supabase
        .from('service_catalog')
        .select('*')
        .eq('id', id)
        .eq('organization_id', orgId)
        .single()

    if (error) return null
    return data as ServiceCatalogItem
}

export async function createCatalogItem(data: Partial<ServiceCatalogItem>) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        throw new Error("No org")
    }

    // Fix: Extract non-DB fields and move them to metadata
    const { cta_type, price_label_type, metadata, ...dbData } = data
    const safeMetadata = {
        ...(metadata || {}),
        cta_type,
        price_label_type
    }

    const { data: newItem, error } = await supabase
        .from('service_catalog')
        .insert({
            ...dbData,
            metadata: safeMetadata,
            organization_id: orgId
        })
        .select()
        .single()

    if (error) {
        throw error
    }
    revalidatePath('/portfolio')
    revalidatePath('/dashboard')
    return { success: true, data: newItem }
}

export async function updateCatalogItem(id: string, data: Partial<ServiceCatalogItem>) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No org")

    // Fix: Extract non-DB fields and move them to metadata to avoid "column does not exist" error
    const { cta_type, price_label_type, metadata, ...dbData } = data

    // Only update metadata if we have new values or if metadata is provided
    let updatePayload: any = { ...dbData }

    if (cta_type || price_label_type || metadata) {
        // We need to be careful with updates. ideally we merge, but for now let's just push what we have.
        // If we don't fetch existing, we might overwrite. 
        // However, the form sends the full object usually.
        updatePayload.metadata = {
            ...(metadata || {}),
            // Only add if they are defined
            ...(cta_type ? { cta_type } : {}),
            ...(price_label_type ? { price_label_type } : {})
        }
    }

    const { data: updated, error } = await supabase
        .from('service_catalog')
        .update(updatePayload)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()

    if (error) {
        console.error("❌ UPDATE CATALOG ITEM ERROR:", JSON.stringify(error, null, 2))
        throw error
    }
    revalidatePath('/portfolio')
    revalidatePath('/dashboard')
    return { success: true, data: updated }
}

export async function deleteCatalogItem(id: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No org")

    const { error } = await supabase
        .from('service_catalog')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) throw error
    revalidatePath('/portfolio')
    revalidatePath('/dashboard')
    return { success: true }
}

import { CATALOG_TEMPLATES } from "./templates/data"

export async function seedCatalogFromTemplate(templateId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No org")

    const template = CATALOG_TEMPLATES.find(t => t.id === templateId)
    if (!template) throw new Error("Template not found")

    // Prepare items with orgId
    const itemsToInsert = template.items.map(item => ({
        ...item,
        organization_id: orgId
    }))

    const { error } = await supabase
        .from('service_catalog')
        .insert(itemsToInsert as any)

    if (error) throw error
    revalidatePath('/portfolio')
    revalidatePath('/dashboard')
    return { success: true, count: itemsToInsert.length }
}

export async function getCatalogItems() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    // Fetch Catalog AND Categories in parallel
    const [
        { data: catalogItems, error: catalogError },
        { data: categories, error: categoryError }
    ] = await Promise.all([
        supabase
            .from('service_catalog')
            .select('*')
            .eq('organization_id', orgId),
        supabase
            .from('service_categories')
            .select('id, name')
            .eq('organization_id', orgId)
    ])

    if (catalogError) {
        console.error('Error fetching catalog items:', catalogError)
        return []
    }

    // Map IDs to Names
    const categoryMap = (categories || []).reduce((acc: Record<string, string>, cat) => {
        acc[cat.id] = cat.name
        return acc
    }, {})

    const itemsWithName = (catalogItems || []).map(item => ({
        ...item,
        category: categoryMap[item.category] || item.category
    }))

    // Order by resolved category name
    return itemsWithName.sort((a, b) => (a.category || '').localeCompare(b.category || '')) as ServiceCatalogItem[]
}



