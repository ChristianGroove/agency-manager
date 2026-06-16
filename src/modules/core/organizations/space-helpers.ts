'use server'
import { getCurrentOrgDetails, getCurrentOrganizationId } from "./actions/crud"

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

        const { data: appData } = await (await createClient())
            .from('saas_apps')
            .select('space_category')
            .eq('id', orgDetails.active_app_id)
            .maybeSingle()

        return (appData?.space_category as SpaceCategory) || 'agency'
    } catch (error) {
        console.error('[SpaceCategory] Error resolving space category:', error)
        return 'agency'
    }
}

import { DynamicSpaceConfig, CAPABILITY_PRESETS } from "./capabilities-registry"
import { createClient } from "@/modules/core/database/supabase-server";

/**
 * Resolves the full dynamic configuration for an organization.
 * Priority: DB Configuration > Vertical Preset > Hardcoded Registry
 */
export async function resolveOrgCapabilities(orgId: string): Promise<DynamicSpaceConfig> {
    const category = await getOrgSpaceCategory(orgId)
    const orgDetails = await getCurrentOrgDetails(orgId)
    
    // Start with the preset for the category
    const baseConfig = CAPABILITY_PRESETS[category] || CAPABILITY_PRESETS.agency
    
    // If the org has dynamic UI config in metadata/features, we merge it here
    // For now, we use the presets, but this is prepared for the JSONB DB fields.
    const dynamicUIConfig = orgDetails?.active_app?.ui_config || null

    if (dynamicUIConfig) {
        return {
            ...baseConfig,
            ...dynamicUIConfig,
            terminology: { ...baseConfig.terminology, ...dynamicUIConfig.terminology },
            policies: { ...baseConfig.policies, ...dynamicUIConfig.policies }
        }
    }

    return baseConfig
}
