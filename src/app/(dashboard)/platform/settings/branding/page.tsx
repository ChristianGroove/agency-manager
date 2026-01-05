import { BrandCenter } from "@/modules/core/branding/components/brand-center" // Ensure path is correct
import { getEffectiveBranding } from "@/modules/core/branding/actions"
import { getActiveModules } from "@/modules/core/saas/actions"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

export default async function BrandingPage() {
    const orgId = await getCurrentOrganizationId()

    // Parallel fetch for performance using Promise.all in the new approach would be better 
    // but the actions already handle caching hopefully. 
    // Actually getEffectiveBranding (from audit) does simple fetching.

    const settings = await getEffectiveBranding(orgId)
    const activeModules = await getActiveModules(orgId ?? undefined)

    return (
        <BrandCenter
            initialSettings={settings}
            activeModules={activeModules || []}
        />
    )
}
