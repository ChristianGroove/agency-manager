import { Suspense } from "react"
import { getEffectiveBranding } from "@/modules/core/branding/actions"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { requireOrgRole } from "@/lib/auth/org-roles"
import { IdentityDashboard } from "@/modules/core/branding/components/identity-dashboard"
import { supabaseAdmin } from "@/lib/supabase-admin" // For tier fetching optimization

export const metadata = {
    title: "ADN - Identidad del Negocio | Pixy Admin",
    description: "Centro de identidad y marca de tu negocio."
}

export default async function IdentityPage() {
    const orgId = await getCurrentOrganizationId()
    await requireOrgRole('admin')

    const brandingSettings = await getEffectiveBranding(orgId)
    console.log('[IDENTITY_PAGE_DEBUG] OrgID:', orgId)
    console.log('[IDENTITY_PAGE_DEBUG] Branding:', JSON.stringify(brandingSettings?.logos, null, 2))

    // Fetch Tier Features directly for passing down
    // (This logic is partly duplicated in getEffectiveBranding but we need the raw features object for the UI locks)
    let tierFeatures: any = {}
    if (orgId) {
        const { data: org } = await supabaseAdmin
            .from("organizations")
            .select(`
                branding_tier_id,
                branding_tier:branding_tiers(features)
            `)
            .eq("id", orgId)
            .single()

        const features = (org?.branding_tier as any)?.features || {}

        // Safety Override: Force unlock if tier ID is whitelabel or custom
        const tierId = org?.branding_tier_id || ''
        const isPremium = tierId.includes('whitelabel') || tierId.includes('custom')

        tierFeatures = {
            ...features,
            custom_logo: !!features.custom_logo || isPremium,
            custom_colors: !!features.custom_colors || isPremium,
            remove_pixy_branding: !!features.remove_pixy_branding || isPremium,
            custom_domain: !!features.custom_domain || isPremium,
        }
    }

    return (
        <IdentityDashboard
            initialSettings={brandingSettings}
            tierFeatures={tierFeatures}
        />
    )
}
