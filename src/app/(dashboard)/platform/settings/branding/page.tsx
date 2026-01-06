import { BrandCenter } from "@/modules/core/branding/components/brand-center"
import { getEffectiveBranding } from "@/modules/core/branding/actions"
import { getCurrentBrandingTier } from "@/modules/core/branding/tier-actions"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

export default async function BrandingPage() {
    const orgId = await getCurrentOrganizationId()

    // Parallel fetch for performance
    const [settings, tierData] = await Promise.all([
        getEffectiveBranding(orgId),
        getCurrentBrandingTier()
    ])

    // Extract tier features (default to empty object if no tier)
    const tierFeatures = tierData?.tier?.features || {}

    return (
        <BrandCenter
            initialSettings={settings}
            tierFeatures={tierFeatures}
        />
    )
}

