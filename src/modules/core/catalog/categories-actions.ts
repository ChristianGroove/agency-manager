'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"

/**
 * Service Category Interface
 */
export interface ServiceCategory {
    id: string
    organization_id: string
    name: string
    slug: string
    icon: string  // Lucide icon name
    color: string // Color name for Tailwind
    scope: 'tenant' | 'system' | 'template'
    order_index: number
    created_at?: string
    updated_at?: string
}

/**
 * Get all categories for the current organization
 * Filtered by organization_id and scope=tenant
 */
export async function getCategories(orgId?: string): Promise<ServiceCategory[]> {
    try {
        const supabase = await createClient()
        const organizationId = orgId || await getCurrentOrganizationId()

        if (!organizationId) {
            console.warn('No organization ID found in getCategories')
            return []
        }

        const { data, error } = await supabase
            .from('service_categories')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('scope', 'tenant')
            .order('order_index', { ascending: true })

        if (error) {
            console.error('Error fetching categories:', error)
            return []
        }

        return data || []
    } catch (error) {
        console.error('Unexpected error in getCategories:', error)
        return []
    }
}

/**
 * Create a new category for the current organization
 * Auto-generates slug and assigns next order_index
 */
export async function createCategory(data: {
    name: string
    icon: string
    color: string
}): Promise<ServiceCategory> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        throw new Error('No organization context found')
    }

    // Generate slug from name
    const slug = data.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

    // Get max order_index to append new category at the end
    const { data: existingCategories } = await supabase
        .from('service_categories')
        .select('order_index')
        .eq('organization_id', orgId)
        .order('order_index', { ascending: false })
        .limit(1)

    const nextOrder = (existingCategories?.[0]?.order_index || 0) + 1

    const { data: newCategory, error } = await supabase
        .from('service_categories')
        .insert({
            organization_id: orgId,
            name: data.name,
            slug,
            icon: data.icon,
            color: data.color,
            scope: 'tenant',
            order_index: nextOrder
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating category:', error)
        throw new Error(`Failed to create category: ${error.message}`)
    }

    // Revalidate paths that display categories
    revalidatePath('/services')
    revalidatePath('/portfolio')

    return newCategory
}

/**
 * Update an existing category
 * Validates ownership by organization_id
 */
export async function updateCategory(
    id: string,
    data: Partial<Pick<ServiceCategory, 'name' | 'icon' | 'color' | 'order_index'>>
): Promise<void> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        throw new Error('No organization context found')
    }

    // If name is being updated, regenerate slug
    const updates: any = { ...data }
    if (data.name) {
        updates.slug = data.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
    }

    updates.updated_at = new Date().toISOString()

    const { error } = await supabase
        .from('service_categories')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', orgId) // Security: only update own org's categories

    if (error) {
        console.error('Error updating category:', error)
        throw new Error(`Failed to update category: ${error.message}`)
    }

    revalidatePath('/services')
    revalidatePath('/portfolio')
}

/**
 * Delete a category
 * Validates ownership by organization_id
 * WARNING: This will fail if category is referenced by services
 */
export async function deleteCategory(id: string): Promise<void> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        throw new Error('No organization context found')
    }

    // Check if category is in use by services
    const { data: services } = await supabase
        .from('service_catalog')
        .select('id, name')
        .eq('organization_id', orgId)
        .eq('category', id) // Assuming service_catalog references category by ID
        .limit(1)

    if (services && services.length > 0) {
        throw new Error('Cannot delete category: it is currently assigned to services')
    }

    const { error } = await supabase
        .from('service_categories')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId) // Security: only delete own org's categories

    if (error) {
        console.error('Error deleting category:', error)
        throw new Error(`Failed to delete category: ${error.message}`)
    }

    revalidatePath('/services')
    revalidatePath('/portfolio')
}

/**
 * Reorder categories
 * Updates order_index for multiple categories at once
 */
export async function reorderCategories(categoryIds: string[]): Promise<void> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        throw new Error('No organization context found')
    }

    // Update each category with its new order_index
    const updates = categoryIds.map((id, index) =>
        supabase
            .from('service_categories')
            .update({ order_index: index + 1, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('organization_id', orgId)
    )

    const results = await Promise.all(updates)

    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
        console.error('Error reordering categories:', errors)
        throw new Error('Failed to reorder some categories')
    }

    revalidatePath('/services')
    revalidatePath('/portfolio')
}
