'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentOrgDetails, getCurrentOrganizationId } from "./actions"

// ============================================
// SPACE CATEGORY — Single Source of Truth
// ============================================

/**
 * Normalized space categories.
 * Drives UI rendering, card layouts, and feature visibility.
 * Stored in saas_apps.space_category column.
 */
export type SpaceCategory = 'agency' | 'resto' | 'cleaning' | 'platform' | 'retail' | 'saas'

/**
 * Get the space category for the current organization.
 * Reads organizations.active_app_id → saas_apps.space_category.
 * Returns 'agency' as safe default if no app is assigned.
 */
export async function getOrgSpaceCategory(orgId?: string): Promise<SpaceCategory> {
    try {
        const activeOrgId = orgId || await getCurrentOrganizationId()
        if (!activeOrgId) return 'agency'

        const orgDetails = await getCurrentOrgDetails(activeOrgId)
        if (!orgDetails?.active_app_id) return 'agency'

        const { data: appData } = await supabaseAdmin
            .from('saas_apps')
            .select('space_category')
            .eq('id', orgDetails.active_app_id)
            .single()

        return (appData?.space_category as SpaceCategory) || 'agency'
    } catch (error) {
        console.error('[SpaceCategory] Error resolving space category:', error)
        return 'agency'
    }
}
