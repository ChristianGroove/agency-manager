import { Suspense } from "react"
import { redirect } from "next/navigation"
import { hasRole } from "@/modules/core/iam/services/org-roles"
import { hasPermission } from "@/modules/core/iam/services/role-service"
import { PERMISSIONS } from "@/modules/core/iam/actions/permissions"
import { Loader2 } from "lucide-react"
import { MarketplacePage } from "@/modules/infrastructure/integrations/marketplace/components/marketplace-page"
import { getMarketplaceProviders, getInstalledIntegrations } from "@/modules/infrastructure/integrations/marketplace/marketplace-actions"
import { getAICredentials, getAIProviders, getTenantAIGovernanceContext } from "@/modules/infrastructure/ai-engine/actions"

export default async function Page() {
    const [canManageIntegrations, isAdmin] = await Promise.all([
        hasPermission(PERMISSIONS.ORG.MANAGE_INTEGRATIONS),
        hasRole('admin')
    ])

    if (!canManageIntegrations && !isAdmin) {
        redirect('/dashboard?error=unauthorized')
    }

    const [providers, installed, aiCredentials, aiProviders, aiGovernance] = await Promise.all([
        getMarketplaceProviders(),
        getInstalledIntegrations(),
        getAICredentials(),
        getAIProviders(),
        getTenantAIGovernanceContext(),
    ])

    return (
        <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
            <MarketplacePage
                providers={providers}
                installedIntegrations={installed}
                aiCredentials={aiCredentials}
                aiProviders={aiProviders}
                aiGovernance={aiGovernance}
            />
        </Suspense>
    )
}
