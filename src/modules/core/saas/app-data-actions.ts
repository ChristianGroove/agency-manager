"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { SaasApp } from "@/types/saas"
import { cache } from "react"

/**
 * Get current organization's active app (Vertical)
 * BRIDGE: Maps the new Vertical System to the old "App" interface for frontend compatibility
 * This is a lightweight version for UI components like the Header to avoid heavy dependencies.
 */
export const getCurrentOrganizationApp = cache(async () => {
    const organizationId = await getCurrentOrganizationId()

    if (!organizationId) return null

    const supabase = await createClient()

    // 1. Fetch Organization Details (Vertical + Active App)
    const { data: org } = await supabase
        .from('organizations')
        .select('vertical_key, active_app_id')
        .eq('id', organizationId)
        .single()

    if (!org) return null

    // 2. Fetch App Definition from DB
    const appId = org.active_app_id || (org.vertical_key ? `app_${org.vertical_key}` : null)

    if (appId) {
        const { data: appData } = await supabaseAdmin
            .from('saas_apps')
            .select(`
                id,
                name,
                price_monthly,
                features,
                color,
                slug,
                description,
                category,
                icon,
                created_at,
                is_active
            `)
            .eq('id', appId)
            .single()

        if (appData) {
            return {
                app: appData as unknown as SaasApp,
                activated_at: new Date().toISOString(),
                metadata: { type: 'dynamic', appId }
            }
        }
    }

    // 3. Ultimate Fallback (Legacy/Unknown)
    return {
        app: {
            id: 'legacy_fallback',
            name: 'Legacy Workspace',
            slug: 'legacy',
            category: 'general',
            icon: 'Box',
            color: '#64748b',
            created_at: new Date().toISOString(),
            status: 'published',
            price_monthly: 0,
            trial_days: 0,
            is_active: true,
            is_featured: false,
            sort_order: 0,
            vertical_compatibility: [],
            description: 'Legacy Workspace',
        } as SaasApp,
        activated_at: new Date().toISOString(),
        metadata: {}
    }
})

