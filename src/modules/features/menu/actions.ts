'use server'

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"
import { RestoMenuCategory, RestoMenuItem } from "@/types"

/**
 * =====================================
 * CATEGORIES
 * =====================================
 */

export async function getMenuCategories(): Promise<RestoMenuCategory[]> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    const { data, error } = await supabase
        .from('resto_menu_categories')
        .select('*')
        .eq('organization_id', orgId)
        .order('order_index', { ascending: true })

    if (error) {
        console.error('Error fetching menu categories:', error)
        return []
    }
    return data
}

export async function createMenuCategory(name: string, icon?: string): Promise<RestoMenuCategory> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No organization context')

    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    
    // Get max order
    const { data: existing } = await supabase
        .from('resto_menu_categories')
        .select('order_index')
        .eq('organization_id', orgId)
        .order('order_index', { ascending: false })
        .limit(1)

    const nextOrder = (existing?.[0]?.order_index || 0) + 1

    const { data, error } = await supabase
        .from('resto_menu_categories')
        .insert({
            organization_id: orgId,
            name,
            slug,
            icon,
            order_index: nextOrder
        })
        .select()
        .single()

    if (error) throw new Error(`Failed to create category: ${error.message}`)
    
    revalidatePath('/menu')
    return data
}

export async function updateMenuCategory(id: string, updates: Partial<RestoMenuCategory>): Promise<void> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No org')

    const safeUpdates: any = { ...updates, updated_at: new Date().toISOString() }
    if (updates.name) {
        safeUpdates.slug = updates.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    }

    const { error } = await supabase
        .from('resto_menu_categories')
        .update(safeUpdates)
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) throw new Error(`Failed to update category: ${error.message}`)
    revalidatePath('/menu')
}

export async function deleteMenuCategory(id: string): Promise<void> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No org')

    // Safe deletion check
    const { data: items } = await supabase
        .from('resto_menu_items')
        .select('id')
        .eq('organization_id', orgId)
        .eq('category_id', id)
        .limit(1)

    if (items && items.length > 0) {
        throw new Error('Cannot delete category: it has menu items inside')
    }

    const { error } = await supabase
        .from('resto_menu_categories')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) throw new Error(`Failed to delete category: ${error.message}`)
    revalidatePath('/menu')
}

export async function reorderMenuCategories(categoryIds: string[]): Promise<void> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No org')

    const updates = categoryIds.map((id, index) =>
        supabase
            .from('resto_menu_categories')
            .update({ order_index: index + 1, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('organization_id', orgId)
    )

    const results = await Promise.all(updates)
    if (results.some(r => r.error)) throw new Error('Failed to reorder some categories')
    
    revalidatePath('/menu')
}

/**
 * =====================================
 * MENU ITEMS
 * =====================================
 */

export async function getMenuItems(): Promise<RestoMenuItem[]> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    // Fetch items with category and modifiers joined
    const { data, error } = await supabase
        .from('resto_menu_items')
        .select(`
            *,
            category:resto_menu_categories(*),
            resto_item_modifier_groups(
                order_index,
                resto_modifier_groups(*)
            )
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching menu items:', error)
        return []
    }

    // Map the nested modifiers to a flat array
    const formattedData = data.map((item: any) => {
        let modifiers = []
        if (item.resto_item_modifier_groups) {
            // Sort by order_index and extract the actual group object
            modifiers = item.resto_item_modifier_groups
                .sort((a: any, b: any) => a.order_index - b.order_index)
                .map((link: any) => link.resto_modifier_groups)
        }
        return {
            ...item,
            modifiers,
            resto_item_modifier_groups: undefined // remove the raw join data
        }
    })

    return formattedData as any
}

export async function createMenuItem(data: Partial<RestoMenuItem>): Promise<RestoMenuItem> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No org')

    const { category, modifiers, resto_item_modifier_groups, ...dbData } = data as any

    const { data: newItem, error } = await supabase
        .from('resto_menu_items')
        .insert({
            ...dbData,
            organization_id: orgId
        })
        .select()
        .single()

    if (error) throw new Error(`Failed to create item: ${error.message}`)
    
    revalidatePath('/menu')
    return newItem
}

export async function updateMenuItem(id: string, data: Partial<RestoMenuItem>): Promise<void> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No org')

    const { category, modifiers, resto_item_modifier_groups, ...dbData } = data as any
    dbData.updated_at = new Date().toISOString()

    const { error } = await supabase
        .from('resto_menu_items')
        .update(dbData)
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) throw new Error(`Failed to update item: ${error.message}`)
    revalidatePath('/menu')
}

export async function deleteMenuItem(id: string): Promise<void> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No org')

    // Soft delete to maintain order history integrity
    const { error } = await supabase
        .from('resto_menu_items')
        .update({ deleted_at: new Date().toISOString(), is_visible: false, is_available: false })
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) throw new Error(`Failed to delete item: ${error.message}`)
    revalidatePath('/menu')
}
