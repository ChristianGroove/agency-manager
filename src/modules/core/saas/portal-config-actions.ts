"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"

/**
 * Get portal configuration for an app
 */
export async function getAppPortalConfig(appId: string) {
    const { data, error } = await supabaseAdmin
        .from('saas_apps_portal_config')
        .select('*')
        .eq('app_id', appId)
        .order('target_portal')
        .order('display_order')

    if (error) {
        console.error("Error fetching portal config:", error)
        return []
    }

    return data || []
}

/**
 * Update a portal module's enabled status
 */
export async function updateAppPortalModule(moduleId: string, updates: { is_enabled?: boolean, display_order?: number, portal_tab_label?: string }) {
    const { error } = await supabaseAdmin
        .from('saas_apps_portal_config')
        .update(updates)
        .eq('id', moduleId)

    if (error) {
        console.error("Error updating portal module:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/platform/admin/apps')
    return { success: true }
}

/**
 * Add a new portal module to an app
 */
export async function addAppPortalModule(appId: string, module: {
    module_slug: string
    portal_tab_label: string
    portal_icon_key: string
    portal_component_key: string
    target_portal: 'client' | 'staff'
}) {
    // Get max display order
    const { data: existing } = await supabaseAdmin
        .from('saas_apps_portal_config')
        .select('display_order')
        .eq('app_id', appId)
        .eq('target_portal', module.target_portal)
        .order('display_order', { ascending: false })
        .limit(1)

    const nextOrder = (existing?.[0]?.display_order || 0) + 1

    const { error } = await supabaseAdmin
        .from('saas_apps_portal_config')
        .insert({
            app_id: appId,
            ...module,
            display_order: nextOrder,
            is_enabled: true
        })

    if (error) {
        console.error("Error adding portal module:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/platform/admin/apps')
    return { success: true }
}

/**
 * Delete a portal module
 */
export async function deleteAppPortalModule(moduleId: string) {
    const { error } = await supabaseAdmin
        .from('saas_apps_portal_config')
        .delete()
        .eq('id', moduleId)

    if (error) {
        console.error("Error deleting portal module:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/platform/admin/apps')
    return { success: true }
}

/**
 * Reorder portal modules
 */
export async function reorderAppPortalModules(updates: { id: string, display_order: number }[]) {
    const promises = updates.map(({ id, display_order }) =>
        supabaseAdmin
            .from('saas_apps_portal_config')
            .update({ display_order })
            .eq('id', id)
    )

    const results = await Promise.all(promises)
    const errors = results.filter(r => r.error)

    if (errors.length > 0) {
        console.error("Error reordering modules:", errors)
        return { success: false, error: "Error al reordenar módulos" }
    }

    revalidatePath('/platform/admin/apps')
    return { success: true }
}
