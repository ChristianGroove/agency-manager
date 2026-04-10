"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"

/**
 * Generates a transaction for Branding Total (White Label) upgrade.
 * This transaction is paid TO PIXY, not to the agency.
 */
export async function createBrandingUpgradeTransaction() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error("No organization context")

    // 1. Verify current tier and direct billing permission
    const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('branding_tier_id, name, allow_direct_billing')
        .eq('id', orgId)
        .single()

    if (org?.allow_direct_billing === false) {
        throw new Error("El cobro directo está deshabilitado para esta organización. Por favor contacta a tu proveedor.")
    }

    if (org?.branding_tier_id === 'whitelabel') {
        throw new Error("La organización ya cuenta con Branding Total.")
    }

    // 2. Prepare Transaction
    const tierId = 'whitelabel'
    const amount = 99 // USD - Hardcoded for now based on strategy
    const reference = `BRAND-UPGRADE-${orgId.slice(0, 8)}-${Date.now()}`

    // 3. Record PENDING transaction
    const { data: tx, error } = await supabaseAdmin
        .from('payment_transactions')
        .insert({
            organization_id: orgId,
            reference,
            amount_in_cents: amount * 100,
            currency: 'USD',
            status: 'PENDING',
            metadata: {
                type: 'branding_upgrade',
                target_tier: tierId,
                concept: 'Pixy Branding Total (White Label) Upgrade'
            }
        })
        .select()
        .single()

    if (error) {
        console.error("Error creating upgrade transaction:", error)
        throw new Error("No se pudo iniciar el proceso de pago.")
    }

    // 4. Return parameters for Wompi Widget (using PIXY credentials)
    // We expect the frontend to use PIXY'S PUBLIC KEY which is in env.
    return {
        success: true,
        reference,
        amountInCents: amount * 100,
        currency: 'USD',
        concept: `Upgrade de Branding: ${org?.name || 'Workspace'}`
    }
}

/**
 * Server-side validation (for UI feedback after redirect)
 */
export async function checkUpgradeStatus() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return false

    const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('branding_tier_id')
        .eq('id', orgId)
        .single()

    return org?.branding_tier_id === 'whitelabel'
}

