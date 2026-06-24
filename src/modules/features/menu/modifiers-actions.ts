'use server'

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"
import { RestoMenuModifierGroup } from "@/types"

export async function getModifierGroups(): Promise<RestoMenuModifierGroup[]> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    const { data, error } = await supabase
        .from('resto_modifier_groups')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching modifier groups:', error)
        return []
    }
    return data
}

export async function createModifierGroup(data: Partial<RestoMenuModifierGroup>): Promise<{ success: boolean; data?: RestoMenuModifierGroup; error?: string }> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: 'Unauthorized' }

    const { data: newGroup, error } = await supabase
        .from('resto_modifier_groups')
        .insert({
            organization_id: orgId,
            name: data.name,
            required: data.required || false,
            min_selections: data.min_selections || 0,
            max_selections: data.max_selections || 1,
            options: data.options || []
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating modifier group:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/resto/menu')
    return { success: true, data: newGroup }
}

export async function updateModifierGroup(id: string, data: Partial<RestoMenuModifierGroup>): Promise<{ success: boolean; data?: RestoMenuModifierGroup; error?: string }> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: 'Unauthorized' }

    const { data: updatedGroup, error } = await supabase
        .from('resto_modifier_groups')
        .update({
            name: data.name,
            required: data.required,
            min_selections: data.min_selections,
            max_selections: data.max_selections,
            options: data.options,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()

    if (error) {
        console.error('Error updating modifier group:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/resto/menu')
    return { success: true, data: updatedGroup }
}

export async function deleteModifierGroup(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: 'Unauthorized' }

    const { error } = await supabase
        .from('resto_modifier_groups')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) {
        console.error('Error deleting modifier group:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/resto/menu')
    return { success: true }
}

export async function updateItemModifiers(itemId: string, modifierGroupIds: string[]): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: 'Unauthorized' }

    // First delete all existing links for this item
    const { error: delError } = await supabase
        .from('resto_item_modifier_groups')
        .delete()
        .eq('item_id', itemId)
    
    if (delError) {
        console.error('Error deleting old modifier links:', delError)
        return { success: false, error: delError.message }
    }

    // Insert new links
    if (modifierGroupIds.length > 0) {
        const inserts = modifierGroupIds.map((groupId, index) => ({
            item_id: itemId,
            modifier_group_id: groupId,
            order_index: index
        }))

        const { error: insError } = await supabase
            .from('resto_item_modifier_groups')
            .insert(inserts)

        if (insError) {
            console.error('Error inserting modifier links:', insError)
            return { success: false, error: insError.message }
        }
    }

    revalidatePath('/dashboard/resto/menu')
    return { success: true }
}

export async function getItemModifiers(itemId: string): Promise<string[]> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    const { data, error } = await supabase
        .from('resto_item_modifier_groups')
        .select('modifier_group_id')
        .eq('item_id', itemId)
        .order('order_index', { ascending: true })

    if (error) {
        console.error('Error fetching item modifiers:', error)
        return []
    }

    return data.map(d => d.modifier_group_id)
}
