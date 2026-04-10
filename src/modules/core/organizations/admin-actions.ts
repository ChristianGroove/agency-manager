"use server"
import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "./actions/crud"
import { revalidatePath } from "next/cache"
export interface TenantConfigUpdate {
    allow_direct_billing?: boolean
    capabilities?: Record<string, boolean>
}

/**
 * Updates the configuration of a sub-tenant organization.
 * Strictly enforces that the caller is the PARENT RESELLER of the target organization.
 */
export async function updateOrganizationConfig(targetOrgId: string, config: TenantConfigUpdate) {
    const supabase = await createClient()
    const currentOrgId = await getCurrentOrganizationId()

    if (!currentOrgId) {
        return { success: false, error: "Unauthorized" }
    }

    // 1. Verify Parent-Child Relationship logic
    // We check if the target org belongs to the current org (Reseller)
    const { data: targetOrg, error: fetchError } = await supabase
        .from('organizations')
        .select('id, parent_organization_id')
        .eq('id', targetOrgId)
        .single()

    if (fetchError || !targetOrg) {
        return { success: false, error: "Organization not found" }
    }

    // STRICT CHECK: The actor must be the parent of the target
    // Or a super-admin (platform type) - checking platform type would require another query, 
    // but for now we enforce parent relationship which covers Reseller->Client case.
    if (targetOrg.parent_organization_id !== currentOrgId) {
        // Fallback: Check if current user is a Platform Admin (Global)
        const { data: currentOrgDetails } = await supabase
            .from('organizations')
            .select('organization_type')
            .eq('id', currentOrgId)
            .single()

        if (currentOrgDetails?.organization_type !== 'platform') {
            return { success: false, error: "Permission denied: You do not manage this organization" }
        }
    }

    // 2. Perform Update
    const updates: any = {}
    if (config.allow_direct_billing !== undefined) {
        updates.allow_direct_billing = config.allow_direct_billing
    }
    if (config.capabilities !== undefined) {
        updates.capabilities = config.capabilities
    }

    if (Object.keys(updates).length === 0) {
        return { success: true } // Nothing to update
    }

    const { error: updateError } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', targetOrgId)

    if (updateError) {
        console.error("Error updating tenant config:", updateError)
        return { success: false, error: "Database update failed" }
    }

    // 3. Security Log
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { SecurityLogger, SecurityAction } = await import('@/modules/core/security/security-logger')
        await SecurityLogger.log({
            organizationId: currentOrgId, // Logged against the RESELLER (Actor)
            actorId: user.id,
            action: SecurityAction.ORG_UPDATED,
            resourceEntity: 'organization',
            resourceId: targetOrgId,
            metadata: {
                target_org_id: targetOrgId,
                updates
            }
        })
    }

    revalidatePath('/platform/organizations')
    return { success: true }
}

/**
 * Fetches the specific configuration for a tenant (Billing + Capabilities)
 */
export async function getTenantConfig(targetOrgId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('organizations')
        .select('allow_direct_billing, capabilities')
        .eq('id', targetOrgId)
        .single()

    if (error) return null
    return data
}
