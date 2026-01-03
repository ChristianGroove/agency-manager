'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"
import { ServiceCatalogItem } from "@/types"
import { SaasApp } from "@/modules/core/saas/app-management-actions"

// ... existing imports

export async function getSubscriptionApp() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return null

    // Fetch organization's active app
    const { data: org, error } = await supabase
        .from('organizations')
        .select(`
            active_app_id,
            saas_apps!active_app_id (
                *
            )
        `)
        .eq('id', orgId)
        .single()

    if (error || !org?.saas_apps) {
        // It's possible they don't have an active app set yet (legacy or new org)
        return null
    }

    return org.saas_apps as unknown as SaasApp
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
    if (!orgId) throw new Error("No org")

    const { data: newItem, error } = await supabase
        .from('service_catalog')
        .insert({
            ...data,
            organization_id: orgId
        })
        .select()
        .single()

    if (error) throw error
    revalidatePath('/portfolio')
    return { success: true, data: newItem }
}

export async function updateCatalogItem(id: string, data: Partial<ServiceCatalogItem>) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No org")

    const { data: updated, error } = await supabase
        .from('service_catalog')
        .update(data)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()

    if (error) throw error
    revalidatePath('/portfolio')
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
    return { success: true, count: itemsToInsert.length }
}

export async function getCatalogItems() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    const { data, error } = await supabase
        .from('service_catalog')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching catalog items:', error)
        return []
    }

    return data as ServiceCatalogItem[]
}


