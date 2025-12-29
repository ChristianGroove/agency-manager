'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"
import { ServiceCatalogItem } from "@/types"
import { SaaSProduct } from "@/types/saas"

export async function getPortfolioItems() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    const { data, error } = await supabase
        .from('service_catalog')
        .select('*')
        .eq('organization_id', orgId)
        .order('name')

    if (error) {
        console.error("Error fetching portfolio:", error)
        return []
    }

    return data as ServiceCatalogItem[]
}

export async function getPortfolioItem(id: string) {
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

export async function createPortfolioItem(data: Partial<ServiceCatalogItem>) {
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

export async function updatePortfolioItem(id: string, data: Partial<ServiceCatalogItem>) {
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

export async function deletePortfolioItem(id: string) {
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

export async function getSubscriptionApp() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return null

    // This is a bit specific to "SaaS Subscription" model where an org has ONE product it subscribes to.
    // Or maybe this fetches the "App" the agency is building?
    // Based on page.tsx, it returns SaaSProduct.
    // Let's assume it fetches from 'saas_products' linked via subscription.

    // For now, let's just return null or stub it. 
    // Ideally we join organizations -> subscriptions -> products

    return null as SaaSProduct | null
}
